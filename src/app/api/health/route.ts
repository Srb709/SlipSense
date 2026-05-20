import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "SlipSense",
    mode: process.env.OPENAI_API_KEY ? "image-extraction-enabled" : "manual-demo-only"
  });
}
