import { NextRequest, NextResponse } from 'next/server';
import { fetchLeads } from '@/lib/phillyData';

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const data = await fetchLeads({
      neighborhood: p.get('neighborhood') || undefined,
      zipCode: p.get('zipCode') || undefined,
      propertyType: p.get('propertyType') || undefined,
      minValue: p.get('minValue') ? Number(p.get('minValue')) : undefined,
      maxValue: p.get('maxValue') ? Number(p.get('maxValue')) : undefined,
      minYearsOwned: p.get('minYearsOwned') ? Number(p.get('minYearsOwned')) : undefined,
    });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
