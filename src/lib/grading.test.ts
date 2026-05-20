import { describe, expect, it } from "vitest";
import { americanOddsToImpliedProbability, americanOddsToProfit, analyzeSlip, scoreToGrade } from "./grading";
import { demoTickets } from "./demo-data";

describe("american odds helpers", () => {
  it("calculates implied probability for negative odds", () => {
    expect(americanOddsToImpliedProbability(-150)).toBeCloseTo(0.6, 5);
  });

  it("calculates implied probability for positive odds", () => {
    expect(americanOddsToImpliedProbability(300)).toBeCloseTo(0.25, 5);
  });

  it("calculates profit for negative odds", () => {
    expect(americanOddsToProfit(15, -150)).toBeCloseTo(10, 5);
  });

  it("calculates profit for positive odds", () => {
    expect(americanOddsToProfit(10, 250)).toBeCloseTo(25, 5);
  });
});

describe("grading", () => {
  it("maps scores into grades", () => {
    expect(scoreToGrade(98)).toBe("A+");
    expect(scoreToGrade(84)).toBe("B");
    expect(scoreToGrade(72)).toBe("C-");
  });

  it("analyzes a demo slip", () => {
    const analysis = analyzeSlip(demoTickets, 500);

    expect(analysis.totalRisk).toBeGreaterThan(0);
    expect(analysis.ticketAnalyses.length).toBe(demoTickets.length);
    expect(analysis.flags.length).toBeGreaterThan(0);
  });
});
