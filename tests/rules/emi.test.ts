import { describe, it, expect } from 'vitest';
import { calculateEmi } from '../../src/rules/emi';
import { principalFromEmi } from '../../src/rules/eligibility';

describe('calculateEmi', () => {
  it('matches the standard amortizing formula for a known case', () => {
    // P=100000, annual 12% => monthly r=0.01, n=12
    const emi = calculateEmi(100000, 12, 12);
    expect(emi).toBeGreaterThan(8800);
    expect(emi).toBeLessThan(8900);
  });

  it('returns 0 for zero or negative principal', () => {
    expect(calculateEmi(0, 12, 12)).toBe(0);
    expect(calculateEmi(-1000, 12, 12)).toBe(0);
  });

  it('returns 0 for zero or negative tenure', () => {
    expect(calculateEmi(100000, 12, 0)).toBe(0);
    expect(calculateEmi(100000, 12, -5)).toBe(0);
  });

  it('handles a 0% interest rate as simple division', () => {
    expect(calculateEmi(120000, 0, 12)).toBeCloseTo(10000, 5);
  });

  it('produces a higher EMI for shorter tenure at the same rate', () => {
    const short = calculateEmi(500000, 11, 24);
    const long = calculateEmi(500000, 11, 60);
    expect(short).toBeGreaterThan(long);
  });

  it('produces a higher EMI for a higher rate at the same tenure', () => {
    const low = calculateEmi(500000, 10, 36);
    const high = calculateEmi(500000, 20, 36);
    expect(high).toBeGreaterThan(low);
  });
});

describe('principalFromEmi (reverse EMI)', () => {
  it('round-trips with calculateEmi within rounding tolerance', () => {
    const principal = 300000;
    const rate = 13;
    const months = 36;
    const emi = calculateEmi(principal, rate, months);
    const recovered = principalFromEmi(emi, rate, months);
    expect(recovered).toBeCloseTo(principal, 0);
  });

  it('returns 0 for a non-positive EMI', () => {
    expect(principalFromEmi(0, 12, 36)).toBe(0);
    expect(principalFromEmi(-500, 12, 36)).toBe(0);
  });
});
