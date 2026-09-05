import { describe, it, expect } from 'vitest';
import { calculateBorrowerAssessment } from '../../src/rules';
import { PRIYA, RAVI, ANITA } from './fixtures';

describe('Priya scenario (strong salaried borrower)', () => {
  const assessment = calculateBorrowerAssessment(PRIYA);

  it('does not land in DONT_BORROW', () => {
    expect(assessment.verdict.verdict).not.toBe('DONT_BORROW');
  });

  it('produces a relatively narrow, well-priced fair rate range', () => {
    const { min, max } = assessment.rate.fairRateAnnual.value;
    expect(max - min).toBeLessThanOrEqual(4);
    expect(min).toBeLessThan(15); // strong profile should not be priced like a risky one
  });

  it('has HIGH or MEDIUM pricing confidence given her complete profile', () => {
    expect(['HIGH', 'MEDIUM']).toContain(assessment.rate.fairRateAnnual.confidence);
  });

  it('keeps safe amount and lender sanction as distinct figures', () => {
    expect(assessment.amount.safeAmount.value).not.toEqual(assessment.amount.likelyLenderSanction.value);
  });

  it('never recommends an EMI above the safe ceiling', () => {
    const recommended = assessment.emi.scenarios.find((s) => s.tenureMonths === assessment.emi.recommendedTenureMonths)!;
    expect(recommended.exceedsSafeCeiling).toBe(false);
  });
});

describe('Ravi scenario (self-employed, collateral-rich, thin credit file)', () => {
  const assessment = calculateBorrowerAssessment(RAVI);

  it('is routed toward a secured/business lending path, not a plain personal loan', () => {
    expect(assessment.routing.recommendedProductPath.toLowerCase()).toMatch(/secured|business|property/);
  });

  it('has wider pricing confidence than a fully-documented borrower', () => {
    expect(assessment.rate.fairRateAnnual.confidence).not.toBe('HIGH');
  });

  it('does not treat unknown credit score as a poor score', () => {
    expect(RAVI.creditScore.status).toBe('unknown');
    // rate should not be pinned at the worst band - upper bound should stay reasonable
    expect(assessment.rate.fairRateAnnual.value.max).toBeLessThan(20);
  });

  it('switching to the routed secured product (loan against property) lifts the lender-like sanction via collateral', () => {
    const securedAssessment = calculateBorrowerAssessment({ ...RAVI, loanProduct: 'loan_against_property' });
    expect(securedAssessment.amount.likelyLenderSanction.value.max).toBeGreaterThan(
      assessment.amount.likelyLenderSanction.value.max,
    );
  });

  it('still constrains safe borrowing via cash flow, not just collateral value', () => {
    expect(assessment.amount.safeAmount.value.max).toBeLessThan(4500000 * 0.6); // well below raw LTV ceiling
  });
});

describe('Anita scenario (informal income, existing stress, recent bounce)', () => {
  const assessment = calculateBorrowerAssessment(ANITA);

  it('lands in DONT_BORROW or BORROW_LESS, never a plain BORROW', () => {
    expect(['DONT_BORROW', 'BORROW_LESS']).toContain(assessment.verdict.verdict);
  });

  it('flags the recent bounce and high-cost existing debt', () => {
    expect(assessment.riskFlags.recentBounce).toBe(true);
    expect(assessment.riskFlags.highCostExistingDebt).toBe(true);
  });

  it('shows a wide pricing range reflecting risk and missing credit history', () => {
    const { min, max } = assessment.rate.fairRateAnnual.value;
    expect(max - min).toBeGreaterThanOrEqual(2);
  });

  it('does not let productive-purpose framing override current repayment stress', () => {
    // isProductivePurpose is true (scooter may raise income) yet verdict must still reflect stress
    expect(ANITA.isProductivePurpose).toBe(true);
    expect(assessment.verdict.verdict).not.toBe('BORROW');
  });
});
