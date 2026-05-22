import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const p = await req.json();
  const script = `Hi ${p.ownerName},\n\nMy name is [Your Name], a local Philadelphia realtor/investor focused on ${p.neighborhood}. I noticed your property at ${p.address}. Since you've owned it for about ${p.yearsOwned} years${p.absenteeOwner ? ' and appear to receive mail at a different address' : ''}, I wanted to see if you'd consider discussing a sale or partnership.\n\nI can offer a straightforward process, flexible timing, and no-pressure conversation. If helpful, I can share a quick market estimate based on recent nearby transfers.\n\nBest,\n[Your Name]\n[Phone] | [Email]`;
  return NextResponse.json({ script });
}
