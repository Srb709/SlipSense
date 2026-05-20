import type {
  AnalysisFlag,
  BetLeg,
  BetMarket,
  BetTicket,
  Grade,
  LegAnalysis,
  SlipAnalysis,
  TicketAnalysis
} from "./types";

const MARKET_RISK: Record<BetMarket, number> = {
  moneyline: 5,
  spread: 9,
  total: 11,
  "player-prop": 13,
  "nrfi-yrfi": 15,
  futures: 18,
  other: 12
};

export function americanOddsToImpliedProbability(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 0;
  if (odds < 0) return Math.abs(odds) / (Math.abs(odds) + 100);
  return 100 / (odds + 100);
}

export function americanOddsToProfit(stake: number, odds: number): number {
  if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(odds) || odds === 0) return 0;
  if (odds < 0) return stake * (100 / Math.abs(odds));
  return stake * (odds / 100);
}

export function scoreToGrade(score: number): Grade {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasText(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function flattenLegs(tickets: BetTicket[]) {
  return tickets.flatMap((ticket) => ticket.legs);
}

export function analyzeLeg(leg: BetLeg, allTickets: BetTicket[]): LegAnalysis {
  const allLegs = flattenLegs(allTickets);
  const impliedProbability = typeof leg.odds === "number" ? americanOddsToImpliedProbability(leg.odds) : null;
  let score = 96 - MARKET_RISK[leg.market];
  const likes: string[] = [];
  const dislikes: string[] = [];
  const flags: AnalysisFlag[] = [];

  const sameEventCount = allLegs.filter(
    (other) => other.event.trim().toLowerCase() === leg.event.trim().toLowerCase()
  ).length;
  const sameMarketCount = allLegs.filter((other) => other.market === leg.market).length;

  if (leg.market === "moneyline") {
    likes.push("Moneylines are easy to understand because the requirement is simple: your side has to win.");
  }

  if (leg.market === "nrfi-yrfi") {
    dislikes.push("NRFI/YRFI bets are fragile because one walk, one bloop, one bad umpire call, or one homer can kill the ticket immediately.");
    flags.push({
      severity: "warning",
      label: "High-variance first-inning market",
      detail: "First-inning bets are extremely sensitive to tiny events. Keep stake size honest."
    });
  }

  if (leg.market === "player-prop") {
    dislikes.push("Player props need lineup, role, minutes, pitch count, matchup, weather, and injury/news checks before they deserve real money.");
    flags.push({
      severity: "warning",
      label: "News-dependent prop",
      detail: "Verify role, lineup, injury news, pitch count, usage, or minutes before betting."
    });
  }

  if (leg.market === "futures") {
    dislikes.push("Futures tie up bankroll and usually carry worse hold than normal single-game markets.");
  }

  if (typeof leg.odds === "number") {
    const breakEven = americanOddsToImpliedProbability(leg.odds);

    if (leg.odds <= -145) {
      score -= 7;
      dislikes.push(`Heavy juice at ${leg.odds}. This needs a high hit rate just to break even.`);
      flags.push({
        severity: "warning",
        label: "Expensive price",
        detail: `At ${leg.odds}, the bet needs to hit about ${(breakEven * 100).toFixed(1)}% just to break even.`
      });
    }

    if (leg.odds >= 250) {
      score -= 6;
      dislikes.push("Plus-money long shots are fun, but they can hide a low true hit rate.");
      flags.push({
        severity: "warning",
        label: "Long-shot volatility",
        detail: "A big payout does not matter if the real hit rate is tiny."
      });
    }

    if (leg.odds > -130 && leg.odds < 150) {
      likes.push("The price is not overloaded. You are not paying insane juice to be right.");
    }
  } else {
    score -= 12;
    dislikes.push("No odds were found, so the app cannot calculate break-even percentage.");
    flags.push({ severity: "danger", label: "Missing odds", detail: "Add American odds before trusting the grade." });
  }

  if (sameEventCount > 1) {
    score -= 3;
    flags.push({
      severity: "warning",
      label: "Same-game exposure",
      detail: "You have multiple legs tied to the same event. One weird game script can hurt several bets at once."
    });
  }

  if (sameMarketCount >= 3 && leg.market !== "moneyline") {
    score -= 3;
    flags.push({
      severity: "warning",
      label: "Market concentration",
      detail: `You have several ${leg.market} bets. That can turn one bad market read into a bad day.`
    });
  }

  const combinedText = `${leg.selection} ${leg.event} ${leg.notes ?? ""}`;
  if (hasText(combinedText, ["over", "outs", "strikeouts", "points", "rebounds", "yards"])) {
    flags.push({
      severity: "info",
      label: "Requirement clarity",
      detail: "Make sure you know the exact requirement. Example: over 17.5 pitcher outs means he must finish 6 full innings."
    });
  }

  if (likes.length === 0) {
    likes.push("The bet is readable and can be evaluated with clear odds, stake, and market type.");
  }

  if (dislikes.length === 0) {
    dislikes.push("No major structural issue found, but this still needs fresh lineup, injury, weather, and odds checks.");
  }

  return {
    legId: leg.id,
    score: clampScore(score),
    grade: scoreToGrade(clampScore(score)),
    impliedProbability,
    likes,
    dislikes,
    flags
  };
}

export function analyzeTicket(ticket: BetTicket, allTickets: BetTicket[]): TicketAnalysis {
  const flags: AnalysisFlag[] = [];
  const likes: string[] = [];
  const dislikes: string[] = [];
  const legAnalyses = ticket.legs.map((leg) => analyzeLeg(leg, allTickets));
  const averageLegScore = legAnalyses.length
    ? legAnalyses.reduce((sum, item) => sum + item.score, 0) / legAnalyses.length
    : 40;

  let score = averageLegScore;

  if (ticket.type === "single") {
    likes.push("Single bets are cleaner than parlays because one correct read can win by itself.");
  }

  if (ticket.type === "parlay") {
    const legCount = ticket.legs.length;
    const parlayPenalty = 8 + Math.max(0, legCount - 2) * 5;
    score -= parlayPenalty;
    dislikes.push(`This is a ${legCount}-leg parlay, so every leg has to survive. The payout is exciting, but the miss rate compounds fast.`);
    flags.push({
      severity: "danger",
      label: "Parlay tax",
      detail: "Parlays make the slip feel cheaper, but they multiply risk and usually punish one weak leg."
    });

    if (legCount > 4) {
      score -= 8;
      flags.push({
        severity: "danger",
        label: "Too many legs",
        detail: "Anything above four legs should be treated as entertainment unless the stake is tiny."
      });
    }
  }

  if (!Number.isFinite(ticket.stake) || ticket.stake <= 0) {
    score -= 10;
    flags.push({ severity: "warning", label: "Missing stake", detail: "Add stake size so bankroll risk can be graded." });
  }

  if (!Number.isFinite(ticket.odds) || ticket.odds === 0) {
    score -= 16;
    flags.push({ severity: "danger", label: "Missing ticket odds", detail: "Add ticket odds to calculate break-even and payout." });
  }

  const uniqueEvents = new Set(ticket.legs.map((leg) => leg.event.trim().toLowerCase()).filter(Boolean));
  if (ticket.type === "parlay" && uniqueEvents.size < ticket.legs.length) {
    score -= 5;
    flags.push({
      severity: "warning",
      label: "Same-event parlay risk",
      detail: "Multiple legs from the same game may be correlated or may all fail from one game script."
    });
  }

  const impliedProbability = americanOddsToImpliedProbability(ticket.odds);
  const potentialProfit = americanOddsToProfit(ticket.stake, ticket.odds);

  if (impliedProbability > 0.62 && ticket.type === "parlay") {
    score -= 5;
    dislikes.push("The parlay has a favorite-style price, but it still carries multi-leg failure risk.");
  }

  if (ticket.type === "single" && ticket.odds > -135 && ticket.odds < 160) {
    likes.push("The ticket price is reasonable enough to review without needing an absurd hit rate.");
  }

  if (likes.length === 0) likes.push("The ticket has enough structure to analyze instead of being a blind gut bet.");
  if (dislikes.length === 0) dislikes.push("No major structural issue found, but this still needs fresh injury, lineup, weather, and odds checks.");

  return {
    ticketId: ticket.id,
    score: clampScore(score),
    grade: scoreToGrade(clampScore(score)),
    impliedProbability,
    potentialProfit,
    totalReturn: ticket.stake + potentialProfit,
    breakEvenLabel: `${(impliedProbability * 100).toFixed(1)}% break-even`,
    likes,
    dislikes,
    flags,
    legAnalyses
  };
}

export function analyzeSlip(tickets: BetTicket[], bankroll?: number): SlipAnalysis {
  const safeTickets = tickets.filter((ticket) => ticket.legs.length > 0);
  const ticketAnalyses = safeTickets.map((ticket) => analyzeTicket(ticket, safeTickets));
  const totalRisk = safeTickets.reduce((sum, ticket) => sum + Math.max(0, ticket.stake || 0), 0);
  const potentialProfit = ticketAnalyses.reduce((sum, ticket) => sum + ticket.potentialProfit, 0);
  const flags: AnalysisFlag[] = [];

  const stakeWeight = safeTickets.reduce((sum, ticket) => sum + Math.max(1, ticket.stake || 0), 0);
  const weightedScore = ticketAnalyses.length
    ? ticketAnalyses.reduce((sum, analysis) => {
        const stake = safeTickets.find((ticket) => ticket.id === analysis.ticketId)?.stake ?? 0;
        return sum + analysis.score * Math.max(1, stake);
      }, 0) / stakeWeight
    : 0;

  let score = weightedScore;
  const parlayCount = safeTickets.filter((ticket) => ticket.type === "parlay").length;
  const nrfiCount = flattenLegs(safeTickets).filter((leg) => leg.market === "nrfi-yrfi").length;
  const propCount = flattenLegs(safeTickets).filter((leg) => leg.market === "player-prop").length;

  if (parlayCount >= 2) {
    score -= 5;
    flags.push({
      severity: "warning",
      label: "Parlay-heavy slip",
      detail: "More than one parlay on the same slip usually means the payout is driving the decision."
    });
  }

  if (nrfiCount >= 3) {
    score -= 5;
    flags.push({
      severity: "danger",
      label: "Too much NRFI/YRFI exposure",
      detail: "Several first-inning bets can wreck the day before you even settle in."
    });
  }

  if (propCount >= 4) {
    score -= 4;
    flags.push({
      severity: "warning",
      label: "Prop-heavy slip",
      detail: "Props need more news and role verification than basic sides/totals."
    });
  }

  if (typeof bankroll === "number" && bankroll > 0) {
    const riskPct = totalRisk / bankroll;
    if (riskPct > 0.1) {
      score -= 10;
      flags.push({
        severity: "danger",
        label: "Bankroll warning",
        detail: `This slip risks ${(riskPct * 100).toFixed(1)}% of bankroll. That is aggressive for one betting day.`
      });
    } else if (riskPct > 0.05) {
      score -= 5;
      flags.push({
        severity: "warning",
        label: "Elevated bankroll risk",
        detail: `This slip risks ${(riskPct * 100).toFixed(1)}% of bankroll. Keep stake size honest.`
      });
    } else {
      flags.push({
        severity: "info",
        label: "Bankroll risk looks controlled",
        detail: `This slip risks ${(riskPct * 100).toFixed(1)}% of bankroll based on the number entered.`
      });
    }
  }

  const sorted = [...ticketAnalyses].sort((a, b) => b.score - a.score);
  const finalScore = clampScore(score);
  const grade = scoreToGrade(finalScore);

  return {
    score: finalScore,
    grade,
    totalRisk,
    potentialProfit,
    totalReturn: totalRisk + potentialProfit,
    bestTicketId: sorted[0]?.ticketId,
    worstTicketId: sorted[sorted.length - 1]?.ticketId,
    summary: buildSlipSummary(grade, finalScore, parlayCount, nrfiCount, totalRisk),
    flags,
    ticketAnalyses
  };
}

function buildSlipSummary(grade: Grade, score: number, parlayCount: number, nrfiCount: number, totalRisk: number) {
  if (score >= 87) {
    return `Strong slip structure. Grade ${grade}. The risk is still real, but the slip is not built like a lottery ticket.`;
  }

  if (parlayCount > 0 && nrfiCount >= 3) {
    return `Grade ${grade}. The biggest problem is stacked volatility: parlays plus several first-inning markets.`;
  }

  if (parlayCount > 0) {
    return `Grade ${grade}. The parlay exposure is the main thing dragging the slip down.`;
  }

  if (totalRisk <= 0) {
    return "Add stakes and odds before trusting the grade.";
  }

  return `Grade ${grade}. Playable pieces may exist, but the app found enough risk to slow down before placing it.`;
}
