import { safeParseNonNegInt } from '../safeStorage';

describe('safeParseNonNegInt', () => {
  it.each([
    [null, 0],
    [undefined, 0],
    ['', 0],
    ['   ', 0],
    ['0', 0],
    ['1', 1],
    ['42', 42],
    ['999', 999],
    ['   17   ', 17],
  ])('coerces %p -> %p', (input, expected) => {
    expect(safeParseNonNegInt(input as string | null | undefined)).toBe(expected);
  });

  it('rejects non-numeric strings', () => {
    for (const bad of ['abc', 'NaN', 'Infinity', '3.14', '1e3', '0x10', '1,000', 'null']) {
      expect(safeParseNonNegInt(bad)).toBe(0);
    }
  });

  it('rejects negative numbers', () => {
    expect(safeParseNonNegInt('-1')).toBe(0);
    expect(safeParseNonNegInt('-9999')).toBe(0);
  });

  it('clamps values above the maximum', () => {
    expect(safeParseNonNegInt('9999999', 100)).toBe(100);
    expect(safeParseNonNegInt('999999')).toBe(999_999);
    expect(safeParseNonNegInt('1000000')).toBe(999_999);
  });

  it('is safe against absurdly long numeric strings', () => {
    const huge = '9'.repeat(1000);
    // parseInt of a 1000-digit string is Infinity, which is treated as
    // corrupt storage — safest fallback is 0, not clamp-to-max. Either
    // is defensible; we just want to prove there's no crash / no NaN.
    const out = safeParseNonNegInt(huge);
    expect(Number.isFinite(out)).toBe(true);
    expect(out).toBeGreaterThanOrEqual(0);
  });
});
