import { NextRequest, NextResponse } from 'next/server';
import { fetchLeads } from '@/lib/phillyData';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const rows = await fetchLeads({
    neighborhood: p.get('neighborhood') || undefined,
    zipCode: p.get('zipCode') || undefined,
    propertyType: p.get('propertyType') || undefined,
    minValue: p.get('minValue') ? Number(p.get('minValue')) : undefined,
    maxValue: p.get('maxValue') ? Number(p.get('maxValue')) : undefined,
    minYearsOwned: p.get('minYearsOwned') ? Number(p.get('minYearsOwned')) : undefined,
  });

  const header = 'Address,Owner Name,Mailing Address,Assessed Value,Ownership Years,Lead Score';
  const lines = rows.map(r => `"${r.address}","${r.ownerName}","${r.mailingAddress}",${r.marketValue},${r.yearsOwned},${r.leadScore}`);
  const csv = [header, ...lines].join('\n');

  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="philly-leads.csv"' } });
}
