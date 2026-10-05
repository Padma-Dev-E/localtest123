import { describe, expect, it } from "vitest";

import { cutoffForHours, parseHours } from "./time-window";

describe("time window", () => {
  it("treats zero as an unbounded window", () => {
    expect(parseHours("0")).toBe(0);
    expect(cutoffForHours(0)).toBeUndefined();
  });

  it("keeps the default and maximum bounds for normal requests", () => {
    expect(parseHours(null)).toBe(24);
    expect(parseHours("999")).toBe(168);
    expect(parseHours("-1")).toBe(24);
  });
});
