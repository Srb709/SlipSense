import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const p = await req.json();
  const leadType = p.distressedFlag ? 'distressed' : p.absenteeOwner ? 'absentee' : p.yearsOwned >= 10 ? 'long-term' : p.outOfPhillyOwner ? 'investor' : 'general';
  const intros: Record<string, string> = {
    absentee: `I noticed you may own ${p.address} as an absentee owner,`,
    'long-term': `you've held ${p.address} for roughly ${p.yearsOwned} years,`,
    distressed: `I saw a potential distress indicator tied to ${p.address},`,
    investor: `you appear to be an out-of-town investor at ${p.address},`,
    general: `I’m reaching out regarding your property at ${p.address},`
  };
  const script = `Hi ${p.ownerName},\n\n${intros[leadType]} and wanted to introduce myself. My name is Steven Brooks with Keller Williams. I help Philadelphia owners sell off-market or list traditionally depending on timing and goals.\n\nIf helpful, I can provide:\n• A no-pressure cash/off-market option\n• A full retail listing strategy\n• Local transfer comps and neighborhood demand insights\n\nIf you're open to a quick call, I can be reached at 215-779-9288 or Steven@themcknightteam.com.\n\nThanks,\nSteven Brooks\nKeller Williams`;
  return NextResponse.json({ script, leadType });
}
