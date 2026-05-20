import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const legSchema = z.object({
  id: z.string().optional(),
  sport: z.string().default("Unknown"),
  league: z.string().default("Unknown"),
  event: z.string().default("Unknown event"),
  market: z.enum(["moneyline", "spread", "total", "player-prop", "nrfi-yrfi", "futures", "other"]).default("other"),
  selection: z.string().default("Unknown selection"),
  odds: z.number().optional(),
  notes: z.string().optional()
});

const ticketSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["single", "parlay"]).default("single"),
  title: z.string().default("Extracted ticket"),
  sportsbook: z.string().optional(),
  stake: z.number().default(0),
  odds: z.number().default(0),
  legs: z.array(legSchema).min(1),
  createdAt: z.string().optional()
});

const extractedSchema = z.object({
  tickets: z.array(ticketSchema).min(1),
  warnings: z.array(z.string()).optional()
});

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function jsonError(status: number, code: string, message: string, detail?: unknown) {
  return NextResponse.json({ code, message, detail }, { status });
}

function maxImageBytes() {
  const envValue = Number(process.env.MAX_IMAGE_UPLOAD_MB ?? 8);
  const megabytes = Number.isFinite(envValue) && envValue > 0 ? envValue : 8;
  return megabytes * 1024 * 1024;
}

function safeId(prefix: string, index: number) {
  return `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string") return record.output_text;

  const output = record.output;
  if (!Array.isArray(output)) return null;

  const textPieces: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const text = (contentItem as Record<string, unknown>).text;
      if (typeof text === "string") textPieces.push(text);
    }
  }

  return textPieces.length ? textPieces.join("\n") : null;
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response did not contain JSON.");
    return JSON.parse(match[0]);
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return jsonError(
      503,
      "MISSING_OPENAI_API_KEY",
      "Screenshot extraction is not configured yet. Add OPENAI_API_KEY to .env.local or use manual entry."
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "BAD_FORM_DATA", "The upload could not be read. Try a normal PNG, JPG, or WEBP screenshot.");
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return jsonError(400, "MISSING_IMAGE", "No image file was uploaded.");
  }

  if (!allowedTypes.has(image.type)) {
    return jsonError(415, "UNSUPPORTED_IMAGE_TYPE", "Upload a PNG, JPG, or WEBP screenshot.", { receivedType: image.type });
  }

  if (image.size > maxImageBytes()) {
    return jsonError(413, "IMAGE_TOO_LARGE", "The screenshot is too large. Compress it or raise MAX_IMAGE_UPLOAD_MB.", {
      receivedBytes: image.size,
      maxBytes: maxImageBytes()
    });
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const dataUrl = `data:${image.type};base64,${imageBuffer.toString("base64")}`;

  const prompt = `Read this betting slip screenshot and extract the tickets as strict JSON only.

Return this exact shape:
{
  "tickets": [
    {
      "type": "single" | "parlay",
      "title": "short title",
      "sportsbook": "book name if visible",
      "stake": number,
      "odds": number,
      "legs": [
        {
          "sport": "Baseball/Basketball/etc",
          "league": "MLB/NBA/etc",
          "event": "team/player event",
          "market": "moneyline" | "spread" | "total" | "player-prop" | "nrfi-yrfi" | "futures" | "other",
          "selection": "exact bet selection",
          "odds": number,
          "notes": "anything uncertain"
        }
      ]
    }
  ],
  "warnings": ["uncertainties"]
}

Rules:
- Use American odds as numbers like -110 or 388.
- If something is unclear, make the best safe guess and add a warning.
- Do not invent odds, teams, or stakes if not visible. Use 0 for unknown ticket odds/stake and omit leg odds when unknown.
- JSON only. No markdown.`;

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: dataUrl }
            ]
          }
        ]
      })
    });
  } catch {
    return jsonError(502, "OPENAI_REQUEST_FAILED", "The image extraction request failed. Use manual entry and try again later.");
  }

  if (!openAiResponse.ok) {
    const detail = await openAiResponse.text().catch(() => null);
    return jsonError(openAiResponse.status, "OPENAI_REQUEST_FAILED", "OpenAI could not analyze the screenshot. Use manual entry for now.", detail);
  }

  const openAiPayload = (await openAiResponse.json().catch(() => null)) as unknown;
  const outputText = extractOutputText(openAiPayload);

  if (!outputText) {
    return jsonError(502, "EMPTY_AI_OUTPUT", "The image model returned no readable text. Use manual entry for now.");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonFromText(outputText);
  } catch (error) {
    return jsonError(502, "BAD_AI_JSON", "The image model returned text that was not valid JSON. Use manual entry for now.", String(error));
  }

  const result = extractedSchema.safeParse(parsed);
  if (!result.success) {
    return jsonError(502, "INVALID_AI_SCHEMA", "The image model returned JSON, but it did not match the SlipSense format.", result.error.flatten());
  }

  const now = new Date().toISOString();
  const tickets = result.data.tickets.map((ticket, ticketIndex) => ({
    ...ticket,
    id: ticket.id ?? safeId("ticket", ticketIndex),
    createdAt: ticket.createdAt ?? now,
    legs: ticket.legs.map((leg, legIndex) => ({
      ...leg,
      id: leg.id ?? safeId("leg", legIndex)
    }))
  }));

  return NextResponse.json({
    source: "ai-image",
    tickets,
    warnings: result.data.warnings ?? []
  });
}
