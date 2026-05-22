import { Filters, PropertyRecord } from './types';

const OPA_BASE = 'https://phl.carto.com/api/v2/sql';

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getLeadScore(absenteeOwner: boolean, yearsOwned: number, distressedFlag: boolean) {
  return (absenteeOwner ? 40 : 0) + (yearsOwned >= 10 ? 30 : 0) + (distressedFlag ? 30 : 0);
}

function mapRecord(row: any): PropertyRecord {
  const yearsOwned = row.sale_date
    ? Math.max(0, new Date().getFullYear() - new Date(row.sale_date).getFullYear())
    : 0;

  const mailingAddress = [row.mailing_address_1, row.mailing_address_2, row.mailing_city_state, row.mailing_zip].filter(Boolean).join(', ');
  const absenteeOwner = !!mailingAddress && !mailingAddress.toLowerCase().includes(String(row.location || '').toLowerCase());
  const distressedFlag = (row.market_value ?? 0) < 120000 || (row.taxable_building ?? 0) === 0;

  return {
    id: String(row.opa_account_num),
    address: row.location || 'Unknown',
    neighborhood: row.census_tract || 'Unknown',
    zipCode: row.zip_code || '',
    propertyType: row.category_code_description || 'Unknown',
    ownerName: row.owners || 'Unknown',
    mailingAddress: mailingAddress || 'Unknown',
    marketValue: toNumber(row.market_value),
    saleDate: row.sale_date,
    yearsOwned,
    absenteeOwner,
    distressedFlag,
    leadScore: getLeadScore(absenteeOwner, yearsOwned, distressedFlag),
  };
}

function buildWhere(filters: Filters) {
  const clauses: string[] = [];
  if (filters.neighborhood) clauses.push(`lower(census_tract) like lower('%${filters.neighborhood.replace(/'/g, "''")}%')`);
  if (filters.zipCode) clauses.push(`zip_code = '${filters.zipCode.replace(/'/g, "''")}'`);
  if (filters.propertyType) clauses.push(`lower(category_code_description) like lower('%${filters.propertyType.replace(/'/g, "''")}%')`);
  if (filters.minValue !== undefined) clauses.push(`market_value >= ${filters.minValue}`);
  if (filters.maxValue !== undefined) clauses.push(`market_value <= ${filters.maxValue}`);
  return clauses.length ? `where ${clauses.join(' and ')}` : '';
}

export async function fetchLeads(filters: Filters): Promise<PropertyRecord[]> {
  const where = buildWhere(filters);
  const sql = `
    select
      opa_account_num, location, zip_code, census_tract, category_code_description,
      owners, mailing_address_1, mailing_address_2, mailing_city_state, mailing_zip,
      market_value, taxable_building, sale_date
    from opa_properties_public
    ${where}
    order by market_value desc
    limit 200
  `;

  const url = `${OPA_BASE}?q=${encodeURIComponent(sql)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch OPA data: ${res.status}`);
  const data = await res.json();

  let mapped = (data.rows || []).map(mapRecord);
  if (filters.minYearsOwned !== undefined) {
    mapped = mapped.filter((r: PropertyRecord) => r.yearsOwned >= (filters.minYearsOwned || 0));
  }
  return mapped;
}
