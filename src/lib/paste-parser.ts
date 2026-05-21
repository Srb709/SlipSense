import type { BetMarket, BetTicket, TicketType } from "./types";
import { newId } from "./utils";

export type ParsedLineResult = {
  line: string;
  parsed: boolean;
  warning?: string;
  ticket?: BetTicket;
};

function inferMarket(text: string): BetMarket {
  const lower = text.toLowerCase();
  if (lower.includes("nrfi") || lower.includes("yrfi")) return "nrfi-yrfi";

  const playerPropKeywords = [
    "prop",
    "outs",
    "strikeout",
    "points",
    "rebounds",
    "assists",
    "yards",
    "touchdowns",
    "hits",
    "bases",
    "saves",
    "shots"
  ];

  const hasPlayerPropKeyword = playerPropKeywords.some((keyword) => lower.includes(keyword));
  const hasOverUnder = /\b(over|under)\b/i.test(text);
  const looksLikeNamedProp = hasOverUnder && /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text);

  if (hasPlayerPropKeyword || looksLikeNamedProp) return "player-prop";
  if (lower.includes("over") || lower.includes("under") || lower.includes("total")) return "total";
  if (lower.includes("ml") || lower.includes("moneyline")) return "moneyline";
  return "other";
}

export function parseSlipText(text: string): ParsedLineResult[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const oddsMatch = line.match(/([+-]\d{3,4})/);
      const stakeMatch = line.match(/\$(\d+(?:\.\d{1,2})?)/);

      if (!oddsMatch || !stakeMatch) {
        return { line, parsed: false, warning: "Could not find both American odds and stake amount." };
      }

      const odds = Number(oddsMatch[1]);
      const stake = Number(stakeMatch[1]);
      if (!Number.isFinite(odds) || !Number.isFinite(stake) || stake <= 0) {
        return { line, parsed: false, warning: "Odds or stake was invalid." };
      }

      const cleaned = line.replace(oddsMatch[1], "").replace(stakeMatch[0], "").trim();
      const type: TicketType = /\bleg\b|parlay/i.test(line) ? "parlay" : "single";
      const market = inferMarket(line);
      const ticket: BetTicket = {
        id: newId("ticket"),
        type,
        title: cleaned || "Parsed ticket",
        sportsbook: "Pasted text",
        stake,
        odds,
        createdAt: new Date().toISOString(),
        legs: [
          {
            id: newId("leg"),
            sport: "Unknown",
            league: "Unknown",
            event: cleaned,
            market,
            selection: cleaned,
            odds,
            notes: "Parsed from pasted slip. Review before grading."
          }
        ]
      };

      return { line, parsed: true, ticket };
    });
}
