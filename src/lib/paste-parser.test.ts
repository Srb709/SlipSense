import { describe, expect, it } from "vitest";
import { parseSlipText } from "./paste-parser";

describe("parseSlipText", () => {
  it("parses simple lines", () => {
    const results = parseSlipText("TB ML -110 $11\nJoe Ryan over 17.5 outs -151 $15");
    expect(results).toHaveLength(2);
    expect(results[0].parsed).toBe(true);
    expect(results[1].parsed).toBe(true);
  });

  it("classifies over/under player lines as player props", () => {
    const results = parseSlipText("Joe Ryan over 17.5 outs -151 $15");
    expect(results[0].parsed).toBe(true);
    expect(results[0].ticket?.legs[0].market).toBe("player-prop");
  });

  it("returns warnings for unparseable lines", () => {
    const results = parseSlipText("No odds here");
    expect(results[0].parsed).toBe(false);
    expect(results[0].warning).toContain("Could not find both");
  });
});
