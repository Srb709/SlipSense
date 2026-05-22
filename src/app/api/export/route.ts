import { NextRequest, NextResponse } from 'next/server';
import { fetchLeads } from '@/lib/phillyData';

const csvEscape = (value: unknown) => {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const rows = await fetchLeads({
    neighborhood: p.get('neighborhood') || undefined,
    zipCode: p.get('zipCode') || undefined,
    propertyType: p.get('propertyType') || undefined,
    includeVacantLand: p.get('includeVacantLand') === 'true',
    minValue: p.get('minValue') ? Number(p.get('minValue')) : undefined,
    maxValue: p.get('maxValue') ? Number(p.get('maxValue')) : undefined,
    minYearsOwned: p.get('minYearsOwned') ? Number(p.get('minYearsOwned')) : undefined,
    leadType: (p.get('leadType') as any) || 'all'
  });

  const headers = ['Address', 'Owner', 'MailingAddress', 'ZipCode', 'PropertyType', 'MarketValue', 'SaleDate', 'YearsOwned', 'LeadScore', 'Tags'];
  const body = rows.map((r) => [r.address, r.ownerName, r.mailingAddress, r.zipCode, r.propertyType, r.marketValue, r.saleDate || '', r.yearsOwned, r.leadScore, r.tags.join('|')].map(csvEscape).join(','));
  const csv = [headers.map(csvEscape).join(','), ...body].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="philly-leads.csv"' } });
}
