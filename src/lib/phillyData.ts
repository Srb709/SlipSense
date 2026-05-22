import { Filters, LeadTag, PropertyRecord } from './types';

const OPA_BASE = 'https://phl.carto.com/api/v2/sql';

const NEIGHBORHOOD_ZIPS: Record<string, string[]> = {
  Fishtown: ['19125'],
  Kensington: ['19125', '19134', '19122'],
  'Port Richmond': ['19134'],
  'South Philly': ['19145', '19146', '19147', '19148'],
  'North Philly': ['19121', '19122', '19132', '19133', '19140']
};

const DIR_MAP: Record<string, string> = { e: 'east', w: 'west', n: 'north', s: 'south' };
const ST_MAP: Record<string, string> = { st: 'street', ave: 'avenue', blvd: 'boulevard', rd: 'road', dr: 'drive', ln: 'lane', ct: 'court', pl: 'place' };
const VACANT_TERMS = ['vacant land', 'vacant', 'land'];
const EXCLUDED_OWNER_TERMS = [
  'philadelphia land bank',
  'city of philadelphia',
  'phila city',
  'philadelphia housing authority',
  'redevelopment authority',
  'school district',
  'commonwealth',
  'united states',
  'u s a',
  'usa',
  'hud',
  'department of housing',
  'penndot',
  'septa',
  'philadelphia gas works',
  'water department',
  'land bank'
];

const normalizeAddress = (raw?: string) =>
  (raw || '')
    .toLowerCase()
    .replace(/[.,#/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => DIR_MAP[t] || ST_MAP[t] || t)
    .join(' ')
    .trim();

const isVacantLand = (propertyType?: string) => {
  const value = String(propertyType || '').toLowerCase();
  return VACANT_TERMS.some((term) => value.includes(term));
};

export function isExcludedOwner(ownerName: string) {
  const owner = String(ownerName || '').toLowerCase();
  return EXCLUDED_OWNER_TERMS.some((term) => owner.includes(term));
}

function score(row: PropertyRecord) {
  let s = 0;
  if (row.absenteeOwner) s += 30;
  if (row.yearsOwned >= 10) s += 25;
  if (row.yearsOwned >= 20) s += 10;
  if (row.outOfPhillyOwner) s += 15;
  if (row.marketValue >= 75000 && row.marketValue <= 500000) s += 15;
  if (row.marketValue < 75000) s -= 25;
  if (row.marketValue > 750000) s -= 10;
  return Math.max(0, Math.min(100, s));
}

function buildWhere(filters: Filters) {
  const clauses: string[] = [];
  if (filters.zipCode) {
    clauses.push(`zip_code = '${filters.zipCode.replace(/'/g, "''")}'`);
  } else if (filters.neighborhood && NEIGHBORHOOD_ZIPS[filters.neighborhood]) {
    const zipList = NEIGHBORHOOD_ZIPS[filters.neighborhood].map((z) => `'${z}'`).join(',');
    clauses.push(`zip_code in (${zipList})`);
  }

  if (filters.propertyType === 'singleFamily') {
    clauses.push("(lower(category_code_description) like '%single family%' or lower(category_code_description) like '%single family residential%')");
  } else if (filters.propertyType === 'multiFamily') {
    clauses.push("(lower(category_code_description) like '%multi family%' or lower(category_code_description) like '%multi-family%' or lower(category_code_description) like '%duplex%' or lower(category_code_description) like '%triplex%' or lower(category_code_description) like '%apartment%')");
  } else if (filters.propertyType === 'mixedUse') {
    clauses.push("lower(category_code_description) like '%mixed use%'");
  } else if (filters.propertyType === 'commercial') {
    clauses.push("lower(category_code_description) like '%commercial%'");
  } else if (filters.propertyType === 'vacantLand') {
    clauses.push("(lower(category_code_description) like '%vacant%' or lower(category_code_description) like '%land%')");
  } else {
    clauses.push("lower(category_code_description) not like '%commercial%'");
  }

  if (filters.minValue !== undefined) clauses.push(`market_value >= ${filters.minValue}`);
  if (filters.maxValue !== undefined) clauses.push(`market_value <= ${filters.maxValue}`);
  return clauses.length ? `where ${clauses.join(' and ')}` : '';
}

export async function fetchLeads(filters: Filters): Promise<PropertyRecord[]> {
  const includeVacantLand = filters.includeVacantLand || filters.propertyType === 'vacantLand';
  const where = buildWhere(filters);

  const sql = `
    select
      parcel_number,
      location,
      zip_code,
      category_code_description,
      owner_1,
      owner_2,
      mailing_address_1,
      mailing_address_2,
      mailing_city_state,
      mailing_zip,
      market_value,
      sale_date
    from opa_properties_public
    ${where}
    limit 400
  `;

  const res = await fetch(`${OPA_BASE}?q=${encodeURIComponent(sql)}`, { next: { revalidate: 1800 } });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Failed to fetch Philly data: ${res.status}. ${details.slice(0, 700)}`);
  }

  const data = await res.json();
  let rows: PropertyRecord[] = (data.rows || []).map((row: any) => {
    const yearsOwned = row.sale_date ? Math.max(0, new Date().getFullYear() - new Date(row.sale_date).getFullYear()) : 0;
    const mailingAddress = [row.mailing_address_1, row.mailing_address_2, row.mailing_city_state, row.mailing_zip].filter(Boolean).join(', ');
    const absenteeOwner = normalizeAddress(row.location) !== normalizeAddress(row.mailing_address_1);
    const outOfPhillyOwner = !(String(row.mailing_city_state || '').toLowerCase().includes('philadelphia') || String(row.mailing_zip || '').startsWith('191'));

    const tags: LeadTag[] = [];
    if (absenteeOwner) tags.push('Absentee Owner');
    if (yearsOwned >= 10) tags.push('Long-Term Owner');
    if (yearsOwned >= 20) tags.push('20+ Year Owner');
    if (outOfPhillyOwner) tags.push('Out-of-Philly Owner');
    if (Number(row.market_value) >= 75000 && Number(row.market_value) <= 500000) tags.push('Good Value Range');
    if (Number(row.market_value) < 75000) tags.push('Very Low Value');

    const rec: PropertyRecord = {
      id: String(row.parcel_number || row.location || ''),
      address: row.location || 'Unknown',
      neighborhood: filters.neighborhood || 'Philadelphia',
      zipCode: row.zip_code || '',
      propertyType: row.category_code_description || 'Unknown',
      ownerName: [row.owner_1, row.owner_2].filter(Boolean).join(' / ') || 'Unknown',
      mailingAddress: mailingAddress || 'Unknown',
      mailingCityState: row.mailing_city_state || '',
      marketValue: Number(row.market_value) || 0,
      saleDate: row.sale_date,
      yearsOwned,
      absenteeOwner,
      outOfPhillyOwner,
      leadScore: 0,
      tags
    };
    rec.leadScore = score(rec);
    return rec;
  });

  rows = rows.filter((r) => !isExcludedOwner(r.ownerName));
  if (!includeVacantLand) rows = rows.filter((r) => !isVacantLand(r.propertyType));
  if (filters.propertyType === 'vacantLand') rows = rows.filter((r) => isVacantLand(r.propertyType));

  if (filters.minYearsOwned !== undefined) rows = rows.filter((r) => r.yearsOwned >= (filters.minYearsOwned || 0));
  if (filters.leadType && filters.leadType !== 'all') {
    const tests = {
      absentee: (r: PropertyRecord) => r.absenteeOwner,
      longTerm: (r: PropertyRecord) => r.yearsOwned >= 10,
      twentyPlus: (r: PropertyRecord) => r.yearsOwned >= 20,
      outOfPhilly: (r: PropertyRecord) => r.outOfPhillyOwner,
      highScore: (r: PropertyRecord) => r.leadScore >= 70
    } as const;
    rows = rows.filter(tests[filters.leadType]);
  }

  return rows.sort((a, b) => b.leadScore - a.leadScore || b.yearsOwned - a.yearsOwned || b.marketValue - a.marketValue);
}

export const neighborhoodOptions = Object.keys(NEIGHBORHOOD_ZIPS);
