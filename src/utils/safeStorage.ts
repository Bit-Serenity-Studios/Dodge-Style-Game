/**
 * Coerce a string from AsyncStorage into a bounded non-negative integer.
 * Anything malformed (NaN, negative, absurdly large, non-string) returns 0.
 * This prevents corrupt storage — from an aborted write, a downgrade, or a
 * manual edit — from crashing the game with NaN/undefined arithmetic.
 */
export function safeParseNonNegInt(raw: string | null | undefined, max = 999_999): number {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!/^-?\d+$/.test(s)) return 0;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > max) return max;
  return n;
}
