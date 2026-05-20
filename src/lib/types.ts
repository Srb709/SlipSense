export type BetMarket =
  | "moneyline"
  | "spread"
  | "total"
  | "player-prop"
  | "nrfi-yrfi"
  | "futures"
  | "other";

export type TicketType = "single" | "parlay";

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";

export type BetLeg = {
  id: string;
  sport: string;
  league: string;
  event: string;
  market: BetMarket;
  selection: string;
  odds?: number;
  notes?: string;
};

export type BetTicket = {
  id: string;
  type: TicketType;
  title: string;
  sportsbook?: string;
  stake: number;
  odds: number;
  legs: BetLeg[];
  createdAt: string;
};

export type AnalysisFlag = {
  severity: "info" | "warning" | "danger";
  label: string;
  detail: string;
};

export type LegAnalysis = {
  legId: string;
  score: number;
  grade: Grade;
  impliedProbability: number | null;
  likes: string[];
  dislikes: string[];
  flags: AnalysisFlag[];
};

export type TicketAnalysis = {
  ticketId: string;
  score: number;
  grade: Grade;
  impliedProbability: number;
  potentialProfit: number;
  totalReturn: number;
  breakEvenLabel: string;
  likes: string[];
  dislikes: string[];
  flags: AnalysisFlag[];
  legAnalyses: LegAnalysis[];
};

export type SlipAnalysis = {
  mainDrivers: string[];
  biggestRisk: string;
  cleanerSuggestion: CleanerSuggestion;
  score: number;
  grade: Grade;
  totalRisk: number;
  potentialProfit: number;
  totalReturn: number;
  bestTicketId?: string;
  worstTicketId?: string;
  summary: string;
  flags: AnalysisFlag[];
  ticketAnalyses: TicketAnalysis[];
};

export type ExtractedSlipPayload = {
  tickets: BetTicket[];
  warnings?: string[];
  source?: "ai-image" | "manual" | "demo";
};

export type CleanerSuggestion = {
  title: string;
  actions: string[];
  rationale: string;
};
