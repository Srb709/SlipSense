import { NextRequest, NextResponse } from 'next/server';
import { fetchLeads } from '@/lib/phillyData';

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const data = await fetchLeads({
      neighborhood: p.get('neighborhood') || undefined,
      propertyType: p.get('propertyType') || undefined,
      minValue: p.get('minValue') ? Number(p.get('minValue')) : undefined,
      maxValue: p.get('maxValue') ? Number(p.get('maxValue')) : undefined,
      minYearsOwned: p.get('minYearsOwned') ? Number(p.get('minYearsOwned')) : undefined,
      leadType: (p.get('leadType') as any) || 'all'
    });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
