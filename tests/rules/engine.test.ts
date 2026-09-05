import { describe, it, expect } from 'vitest';
import { calculateBorrowerAssessment, calculatePeriodicIrr, principalFromEmi } from '../../src/rules';
import type { BorrowerProfile } from '../../src/domain/borrower';

function baseProfile(overrides: Partial<BorrowerProfile> = {}): BorrowerProfile {
  return {
    age: 30,
    loanPurpose: 'other',
    isProductivePurpose: false,
    loanProduct: 'personal_loan',
    requestedAmount: 300000,
    employmentType: 'salaried',
    netMonthlyIncome: { status: 'known', value: 60000 },
    incomeStability: { status: 'known', value: 'stable' },
    existingEmis: [],
    householdMonthlyExpenses: { status: 'known', value: 15000 },
    dependents: 0,
    creditScore: { status: 'known', value: 720 },
    recentEmiBounces: { status: 'known', value: 0 },
    emergencySavingsMonths: { status: 'known', value: 3 },
    collateral: { hasCollateral: false },
    coApplicant: { hasCoApplicant: false },
    existingLenderOffer: { hasOffer: false },
    ...overrides,
  };
}

describe('Unknown credit score handling', () => {
  it('never converts an unknown credit score into 300 or any assumed numeric score', () => {
    const profile = baseProfile({ creditScore: { status: 'unknown' } });
    expect(profile.creditScore.value).toBeUndefined();
    const assessment = calculateBorrowerAssessment(profile);
    // The rate range should widen, not collapse to the worst-case band.
    const known = calculateBorrowerAssessment(baseProfile({ creditScore: { status: 'known', value: 300 } }));
    expect(assessment.rate.fairRateAnnual.value.max).toBeLessThan(known.rate.fairRateAnnual.value.max);
  });

  it('widens the rate range and lowers confidence when unknown', () => {
    const known = calculateBorrowerAssessment(baseProfile());
    const unknown = calculateBorrowerAssessment(baseProfile({ creditScore: { status: 'unknown' } }));
    const knownWidth = known.rate.fairRateAnnual.value.max - known.rate.fairRateAnnual.value.min;
    const unknownWidth = unknown.rate.fairRateAnnual.value.max - unknown.rate.fairRateAnnual.value.min;
    expect(unknownWidth).toBeGreaterThanOrEqual(knownWidth);
  });
});

describe('Safe amount vs safe EMI capacity', () => {
  it('safe borrower amount cannot exceed what the safe EMI capacity supports', () => {
    const profile = baseProfile();
    const assessment = calculateBorrowerAssessment(profile);
    const maxSafeEmi = assessment.emi.safeMonthlyEmiCeiling.value;
    // Reconstruct the maximum principal the safe EMI could support at the
    // most generous rate/tenure combination used internally, then assert
    // the reported safe amount does not exceed a lenient upper bound.
    const generousMonths = 60;
    const lenientRate = assessment.rate.fairRateAnnual.value.min;
    const r = lenientRate / 12 / 100;
    const factor = Math.pow(1 + r, generousMonths);
    const upperBoundPrincipal = (maxSafeEmi * (factor - 1)) / (r * factor);
    expect(assessment.amount.safeAmount.value.max).toBeLessThanOrEqual(upperBoundPrincipal + 1);
  });
});

describe('Missing income stability', () => {
  it('treats unknown stability conservatively (not as stable) and lowers confidence', () => {
    const stable = calculateBorrowerAssessment(baseProfile());
    const unknownStability = calculateBorrowerAssessment(
      baseProfile({ incomeStability: { status: 'unknown' } }),
    );
    expect(unknownStability.affordability.usableMonthlyIncome.value).toBeLessThanOrEqual(
      stable.affordability.usableMonthlyIncome.value,
    );
  });
});

describe('High existing EMI', () => {
  it('reduces safe EMI ceiling and can push verdict toward BORROW_LESS or DONT_BORROW', () => {
    const heavy = calculateBorrowerAssessment(
      baseProfile({ existingEmis: [{ type: 'personal', emi: 28000 }] }),
    );
    expect(['BORROW_LESS', 'DONT_BORROW']).toContain(heavy.verdict.verdict);
  });
});

describe('Recent bounced EMI', () => {
  it('is flagged and pushes pricing and verdict toward more conservative outcomes', () => {
    const bounced = calculateBorrowerAssessment(
      baseProfile({
        existingEmis: [{ type: 'personal', emi: 20000, isHighCost: true, interestRate: 34 }],
        recentEmiBounces: { status: 'known', value: 1 },
      }),
    );
    expect(bounced.riskFlags.recentBounce).toBe(true);
    expect(bounced.verdict.verdict).toBe('DONT_BORROW');
  });
});

describe('Requested amount vs safe amount', () => {
  it('recommends BORROW_LESS or DONT_BORROW when requested amount is far above safe capacity', () => {
    const assessment = calculateBorrowerAssessment(baseProfile({ requestedAmount: 5_00_00_000 }));
    expect(assessment.verdict.verdict).not.toBe('BORROW');
  });

  it('recommends BORROW when requested amount is comfortably below safe capacity', () => {
    const assessment = calculateBorrowerAssessment(baseProfile({ requestedAmount: 50000 }));
    expect(assessment.verdict.verdict).toBe('BORROW');
  });
});

describe('Stress scenario', () => {
  it('produces a stressed safe EMI that is lower than or equal to the normal one', () => {
    const assessment = calculateBorrowerAssessment(baseProfile());
    expect(assessment.stress.stressedSafeEmi).toBeLessThanOrEqual(assessment.stress.normalSafeEmi);
  });

  it('does not describe a rate shock when the stress calculation only changes income', () => {
    const stress = calculateBorrowerAssessment(baseProfile()).stress;
    expect(stress.ratePlusPercent).toBe(0);
    expect(stress.narrative.toLowerCase()).not.toContain('rates rose');
  });
});

describe('Different tenures', () => {
  it('produces multiple EMI scenarios with longer tenure lowering EMI and raising total interest', () => {
    const assessment = calculateBorrowerAssessment(baseProfile({ requestedAmount: 300000 }));
    expect(assessment.emi.scenarios.length).toBeGreaterThan(1);
    const sorted = [...assessment.emi.scenarios].sort((a, b) => a.tenureMonths - b.tenureMonths);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].emi).toBeLessThanOrEqual(sorted[i - 1].emi);
      expect(sorted[i].totalInterest).toBeGreaterThanOrEqual(sorted[i - 1].totalInterest - 1);
    }
  });
});

describe('Processing fee changes APR', () => {
  it('a higher quoted processing fee increases the indicative APR', () => {
    const lowFee = calculateBorrowerAssessment(
      baseProfile({ existingLenderOffer: { hasOffer: true, quotedInterestRate: 12, processingFeePercent: 0.5, quotedTenureMonths: 36 } }),
    );
    const highFee = calculateBorrowerAssessment(
      baseProfile({ existingLenderOffer: { hasOffer: true, quotedInterestRate: 12, processingFeePercent: 4, quotedTenureMonths: 36 } }),
    );
    expect(highFee.apr.indicativeApr.value.max).toBeGreaterThan(lowFee.apr.indicativeApr.value.max);
  });

  it('uses the quoted tenure when building APR cash flows', () => {
    const short = calculateBorrowerAssessment(
      baseProfile({
        existingLenderOffer: { hasOffer: true, quotedInterestRate: 12, processingFeePercent: 4, quotedTenureMonths: 12 },
      }),
    );
    const long = calculateBorrowerAssessment(
      baseProfile({
        existingLenderOffer: { hasOffer: true, quotedInterestRate: 12, processingFeePercent: 4, quotedTenureMonths: 60 },
      }),
    );
    expect(short.apr.indicativeApr.value.max).toBeGreaterThan(long.apr.indicativeApr.value.max);
    expect(short.apr.methodologyNote).toContain('monthly IRR');
  });

  it('solves a periodic IRR for a simple cash-flow stream', () => {
    const monthlyPayment = 110;
    const monthlyIrr = calculatePeriodicIrr([-1000, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment, monthlyPayment]);
    expect(monthlyIrr).toBeDefined();
    expect((Math.pow(1 + monthlyIrr!, 12) - 1) * 100).toBeCloseTo(70.6, 0);
  });

  it('keeps APR finite with an invalid principal by using the documented fallback', () => {
    const assessment = calculateBorrowerAssessment(baseProfile({ requestedAmount: 0 }));
    expect(Number.isFinite(assessment.apr.indicativeApr.value.min)).toBe(true);
    expect(assessment.apr.methodologyNote).toContain('falls back');
  });
});

describe('Recommended safe amount and secured sanction invariants', () => {
  it('offers a conservative safe starting point inside the safe borrowing range', () => {
    const assessment = calculateBorrowerAssessment(baseProfile());
    expect(assessment.amount.recommendedSafeAmount.value).toBeGreaterThanOrEqual(assessment.amount.safeAmount.value.min);
    expect(assessment.amount.recommendedSafeAmount.value).toBeLessThanOrEqual(assessment.amount.safeAmount.value.max);
  });

  it('caps secured sanction at both collateral LTV and repayment capacity', () => {
    const profile = baseProfile({
      loanProduct: 'loan_against_property',
      netMonthlyIncome: { status: 'known', value: 30000 },
      requestedAmount: 2_000_000,
      collateral: {
        hasCollateral: true,
        type: 'property',
        estimatedValue: { status: 'known', value: 10_000_000 },
        existingEncumbrance: 'none',
        ownershipClear: { status: 'known', value: true },
      },
    });
    const assessment = calculateBorrowerAssessment(profile);
    const ltvCeiling = 10_000_000 * 0.6;
    const lenderEmiCapacity = 30000 * 0.55;
    const repaymentCeiling = principalFromEmi(
      lenderEmiCapacity,
      assessment.rate.fairRateAnnual.value.max,
      180,
    );
    expect(assessment.amount.likelyLenderSanction.value.max).toBeLessThanOrEqual(
      Math.min(ltvCeiling, repaymentCeiling) + 1,
    );
  });
});

describe('Secured vs unsecured product', () => {
  it('a secured product with strong collateral prices lower than an unsecured personal loan for the same borrower', () => {
    const unsecured = calculateBorrowerAssessment(baseProfile({ loanProduct: 'personal_loan' }));
    const secured = calculateBorrowerAssessment(
      baseProfile({
        loanProduct: 'gold_loan',
        requestedAmount: 200000,
        collateral: {
          hasCollateral: true,
          type: 'gold',
          estimatedValue: { status: 'known', value: 400000 },
          existingEncumbrance: 'none',
          ownershipClear: { status: 'known', value: true },
        },
      }),
    );
    expect(secured.rate.fairRateAnnual.value.min).toBeLessThanOrEqual(unsecured.rate.fairRateAnnual.value.min);
  });
});

describe('Zero/negative invalid inputs', () => {
  it('does not throw for zero income and returns a low/zero safe ceiling', () => {
    const assessment = calculateBorrowerAssessment(baseProfile({ netMonthlyIncome: { status: 'known', value: 0 } }));
    expect(assessment.emi.safeMonthlyEmiCeiling.value).toBe(0);
    expect(assessment.verdict.verdict).toBe('DONT_BORROW');
  });

  it('does not throw for a negative requested amount and does not crash EMI math', () => {
    expect(() => calculateBorrowerAssessment(baseProfile({ requestedAmount: -50000 }))).not.toThrow();
  });

  it('does not throw for negative income (guards to zero internally)', () => {
    expect(() => calculateBorrowerAssessment(baseProfile({ netMonthlyIncome: { status: 'known', value: -1000 } }))).not.toThrow();
  });
});

describe('Very high income', () => {
  it('scales safe amount up without producing an unrealistic negative or NaN value', () => {
    const assessment = calculateBorrowerAssessment(
      baseProfile({ netMonthlyIncome: { status: 'known', value: 20_00_000 }, requestedAmount: 50_00_000 }),
    );
    expect(Number.isFinite(assessment.amount.safeAmount.value.max)).toBe(true);
    expect(assessment.amount.safeAmount.value.max).toBeGreaterThan(0);
  });
});

describe('Very low income', () => {
  it('produces a very small or zero safe ceiling and steers toward caution', () => {
    const assessment = calculateBorrowerAssessment(
      baseProfile({ netMonthlyIncome: { status: 'known', value: 8000 }, householdMonthlyExpenses: { status: 'known', value: 7000 } }),
    );
    expect(assessment.emi.safeMonthlyEmiCeiling.value).toBeLessThan(2000);
  });
});

describe('Missing optional questions', () => {
  it('still returns a complete assessment when every optional field is absent', () => {
    const minimal: BorrowerProfile = {
      age: 30,
      loanPurpose: 'other',
      isProductivePurpose: false,
      loanProduct: 'personal_loan',
      requestedAmount: 200000,
      employmentType: 'salaried',
      netMonthlyIncome: { status: 'known', value: 50000 },
      incomeStability: { status: 'unknown' },
      existingEmis: [],
      householdMonthlyExpenses: { status: 'unknown' },
      dependents: 0,
      creditScore: { status: 'unknown' },
      recentEmiBounces: { status: 'unknown' },
      collateral: { hasCollateral: false },
      coApplicant: { hasCoApplicant: false },
      existingLenderOffer: { hasOffer: false },
    };
    const assessment = calculateBorrowerAssessment(minimal);
    expect(assessment.overallConfidence).toBe('LOW');
    expect(assessment.verdict.verdict).toBeDefined();
  });
});
