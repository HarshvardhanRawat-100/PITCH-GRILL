import { describe, expect, it } from "vitest";
import {
  formatINR,
  formatMonths,
  formatMultiple,
  formatPct,
  formatSignedPct,
} from "./format";

describe("formatINR", () => {
  it("matches all required test cases in spec", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(850.4)).toBe("₹850");
    expect(formatINR(1000)).toBe("₹1,000");
    expect(formatINR(12345)).toBe("₹12,345");
    expect(formatINR(99999.6)).toBe("₹1.00 L");
    expect(formatINR(100000)).toBe("₹1.00 L");
    expect(formatINR(250000)).toBe("₹2.50 L");
    expect(formatINR(9999999)).toBe("₹1.00 Cr");
    expect(formatINR(10000000)).toBe("₹1.00 Cr");
    expect(formatINR(5e9)).toBe("₹500.00 Cr");
    expect(formatINR(-15000)).toBe("-₹15,000");
    expect(formatINR(-250000)).toBe("-₹2.50 L");
    expect(formatINR(null)).toBe("—");
    expect(formatINR(undefined)).toBe("—");
    expect(formatINR(Number.NaN)).toBe("—");
    expect(formatINR(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatMonths", () => {
  it("formats months properly", () => {
    expect(formatMonths(18.4)).toBe("18.4 mo");
    expect(formatMonths(18.432)).toBe("18.4 mo");
    expect(formatMonths(18.4, true)).toBe("36+ mo");
    expect(formatMonths(null, true)).toBe("36+ mo");
    expect(formatMonths(null)).toBe("—");
    expect(formatMonths(undefined)).toBe("—");
  });
});

describe("formatPct and formatSignedPct", () => {
  it("formats unsigned percentages", () => {
    expect(formatPct(12.5)).toBe("12.5%");
    expect(formatPct(null)).toBe("—");
  });

  it("formats signed percentages with true minus U+2212", () => {
    expect(formatSignedPct(12.5)).toBe("+12.5%");
    expect(formatSignedPct(-40, 0)).toBe("\u221240%");
    expect(formatSignedPct(0, 0)).toBe("0%");
    expect(formatSignedPct(null)).toBe("—");
  });
});

describe("formatMultiple", () => {
  it("formats multiples with U+00D7", () => {
    expect(formatMultiple(3.2)).toBe("3.2\u00d7");
    expect(formatMultiple(null)).toBe("—");
  });
});
