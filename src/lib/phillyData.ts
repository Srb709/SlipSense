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

const normalizeAddress = (raw?: string) =>
  (raw || '')
    .toLowerCase()
    .replace(/[.,#/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => DIR_MAP[t] || ST_MAP[t] || t)
    .join(' ')
    .trim();

const inLastMonths = (date?: string, months = 18) => {
  if (!date) return false;
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return false;
  const now = new Date();
  return now.getTime() - then.getTime() <= months * 30 * 24 * 60 * 60 * 1000;
};

function score(row: PropertyRecord) {
  let s = 0;
  if (row.absenteeOwner) s += 25;
  if (row.yearsOwned >= 10) s += 20;
  if (row.outOfPhillyOwner) s += 15;
  if (row.recentTransfer) s += 10;
  if (row.sheriffSignal) s += 20;
  if (row.delinquencySignal) s += 10;
  if (row.marketValue <= 200000) s += 10;
  return Math.max(0, Math.min(100, s));
}

function buildWhere(filters: Filters) {
  const clauses: string[] = [];
  if (filters.neighborhood && NEIGHBORHOOD_ZIPS[filters.neighborhood]) {
    const zipList = NEIGHBORHOOD_ZIPS[filters.neighborhood].map((z) => `'${z}'`).join(',');
    clauses.push(`zip_code in (${zipList})`);
  }
  if (filters.propertyType) clauses.push(`lower(category_code_description) like lower('%${filters.propertyType.replace(/'/g, "''")}%')`);
  if (filters.minValue !== undefined) clauses.push(`market_value >= ${filters.minValue}`);
  if (filters.maxValue !== undefined) clauses.push(`market_value <= ${filters.maxValue}`);
  return clauses.length ? `where ${clauses.join(' and ')}` : '';
}

export async function fetchLeads(filters: Filters): Promise<PropertyRecord[]> {
  const where = buildWhere(filters);
  const sql = `
    with base as (
      select
        o.opa_account_num, o.location, o.zip_code, o.category_code_description,
        o.owners, o.mailing_address_1, o.mailing_address_2, o.mailing_city_state, o.mailing_zip,
        o.market_value, o.sale_date,
        rtt.recording_date as transfer_date, rtt.document_type,
        case when lower(coalesce(rtt.document_type,'')) like '%sheriff%' then true else false end as sheriff_signal,
        case when lower(coalesce(rtt.document_type,'')) like '%tax%' then true else false end as delinquency_signal
      from opa_properties_public o
      left join rtt_summary rtt on rtt.opa_account_num = o.opa_account_num
      ${where}
      order by o.market_value asc
      limit 400
    ), ranked as (
      select *, row_number() over(partition by opa_account_num order by transfer_date desc nulls last) rn from base
    )
    select * from ranked where rn=1
  `;
  const res = await fetch(`${OPA_BASE}?q=${encodeURIComponent(sql)}`, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Failed to fetch Philly data: ${res.status}`);
  const data = await res.json();
  let rows: PropertyRecord[] = (data.rows || []).map((row: any) => {
    const yearsOwned = row.sale_date ? Math.max(0, new Date().getFullYear() - new Date(row.sale_date).getFullYear()) : 0;
    const mailingAddress = [row.mailing_address_1, row.mailing_address_2, row.mailing_city_state, row.mailing_zip].filter(Boolean).join(', ');
    const absenteeOwner = normalizeAddress(row.location) !== normalizeAddress(row.mailing_address_1);
    const outOfPhillyOwner = !(String(row.mailing_city_state || '').toLowerCase().includes('philadelphia') || String(row.mailing_zip || '').startsWith('191'));
    const recentTransfer = inLastMonths(row.transfer_date);
    const sheriffSignal = Boolean(row.sheriff_signal);
    const delinquencySignal = Boolean(row.delinquency_signal);
    const distressedFlag = sheriffSignal || delinquencySignal || (yearsOwned >= 10 && outOfPhillyOwner);
    const tags: LeadTag[] = [];
    if (absenteeOwner) tags.push('Absentee Owner');
    if (yearsOwned >= 10) tags.push('Long-Term Owner');
    if (outOfPhillyOwner) tags.push('Out-of-Philly Owner');
    if (recentTransfer) tags.push('Recent Transfer');
    if (sheriffSignal || delinquencySignal) tags.push('Sheriff/Distress Signal');
    if (Number(row.market_value) <= 200000) tags.push('Lower Assessed Value');

    const rec: PropertyRecord = {
      id: String(row.opa_account_num),
      address: row.location || 'Unknown',
      neighborhood: filters.neighborhood || 'Philadelphia',
      zipCode: row.zip_code || '',
      propertyType: row.category_code_description || 'Unknown',
      ownerName: row.owners || 'Unknown',
      mailingAddress: mailingAddress || 'Unknown',
      mailingCityState: row.mailing_city_state || '',
      marketValue: Number(row.market_value) || 0,
      saleDate: row.sale_date,
      yearsOwned,
      absenteeOwner,
      outOfPhillyOwner,
      distressedFlag,
      recentTransfer,
      sheriffSignal,
      delinquencySignal,
      latestTransferDate: row.transfer_date,
      latestDocumentType: row.document_type,
      leadScore: 0,
      tags
    };
    rec.leadScore = score(rec);
    return rec;
  });

  if (filters.minYearsOwned !== undefined) rows = rows.filter((r) => r.yearsOwned >= (filters.minYearsOwned || 0));
  if (filters.leadType && filters.leadType !== 'all') {
    const tests = {
      absentee: (r: PropertyRecord) => r.absenteeOwner,
      longTerm: (r: PropertyRecord) => r.yearsOwned >= 10,
      distressed: (r: PropertyRecord) => r.distressedFlag,
      investor: (r: PropertyRecord) => r.absenteeOwner && r.outOfPhillyOwner
    } as const;
    rows = rows.filter(tests[filters.leadType]);
  }
  return rows.sort((a, b) => b.leadScore - a.leadScore);
}

export const neighborhoodOptions = Object.keys(NEIGHBORHOOD_ZIPS);
