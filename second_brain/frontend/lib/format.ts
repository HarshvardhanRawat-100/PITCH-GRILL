/**
 * Currency, duration, and metric formatting utilities for SecondBrain.
 * Indian numbering system (Cr, Lakh, Indian comma grouping).
 */

/**
 * Format a number in Indian Rupees.
 * Rules:
 * - null/undefined/NaN/Infinity -> "—" (em dash)
 * - Negative values: "-₹..." (minus before rupee sign)
 * - >= 1e7 -> "₹X.XX Cr"
 * - >= 1e5 -> "₹X.XX L" (promotes to Cr if rounded lakh reaches 100.00)
 * - >= 1e3 -> "₹X,XXX" (Indian grouping via Intl en-IN)
 * - else -> "₹N" (integer)
 * - No unit above Cr (5e9 -> "₹500.00 Cr")
 */
export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return "—";
  }

  const sign = n < 0 ? "-" : "";
  const absN = Math.abs(n);

  // Check Crore bucket (>= 1 Cr after 2-decimal rounding)
  const crVal = Math.round((absN / 1e7) * 100) / 100;
  if (crVal >= 1.0) {
    return `${sign}₹${crVal.toFixed(2)} Cr`;
  }

  // Check Lakh bucket (>= 1 Lakh after 2-decimal rounding)
  const lakhVal = Math.round((absN / 1e5) * 100) / 100;
  if (lakhVal >= 1.0) {
    if (lakhVal >= 100.0) {
      return `${sign}₹${(lakhVal / 100).toFixed(2)} Cr`;
    }
    return `${sign}₹${lakhVal.toFixed(2)} L`;
  }

  // Rounded integer for amounts under 1 Lakh
  const intVal = Math.round(absN);

  if (intVal >= 1000) {
    const formatted = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(intVal);
    return `${sign}₹${formatted}`;
  }

  return `${sign}₹${intVal}`;
}

/**
 * Format runway in months.
 * - capped -> "36+ mo"
 * - null/non-finite -> "—"
 * - else -> "X.X mo"
 */
export function formatMonths(
  months: number | null | undefined,
  capped?: boolean
): string {
  if (capped) {
    return "36+ mo";
  }
  if (months === null || months === undefined || !Number.isFinite(months)) {
    return "—";
  }
  return `${months.toFixed(1)} mo`;
}

/**
 * Format a percentage with standard suffix.
 * digits defaults to 1 (e.g. "12.5%")
 */
export function formatPct(
  n: number | null | undefined,
  digits: number = 1
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return "—";
  }
  return `${n.toFixed(digits)}%`;
}

/**
 * Format a signed percentage using "+" and true minus "−" (U+2212).
 * e.g. "+12.5%", "−40%", "0%"
 */
export function formatSignedPct(
  n: number | null | undefined,
  digits: number = 1
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return "—";
  }
  if (n > 0) {
    return `+${n.toFixed(digits)}%`;
  }
  if (n < 0) {
    return `\u2212${Math.abs(n).toFixed(digits)}%`;
  }
  return `${n.toFixed(digits)}%`;
}

/**
 * Format a multiple value.
 * e.g. "3.2×" (using U+00D7)
 */
export function formatMultiple(
  n: number | null | undefined,
  digits: number = 1
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return "—";
  }
  return `${n.toFixed(digits)}×`;
}
