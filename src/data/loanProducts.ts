import type { LoanProductProfile } from '../domain/loan';

// Indicative bands only. These are broad, product-level market
// assumptions (my judgement, informed by publicly advertised rate
// ranges across large Indian banks/NBFCs as of early 2026), NOT a quote
// from any specific lender and NOT sourced from RBI. See RULES.md.
export const LOAN_PRODUCTS: Record<string, LoanProductProfile> = {
  personal_loan: {
    id: 'personal_loan',
    label: 'Personal loan',
    secured: false,
    baseRateRangeAnnual: { min: 10.5, max: 22 },
    tenureMonthsRange: { min: 12, max: 60 },
    comparisonTenuresMonths: [24, 36, 48, 60],
    processingFeePercentRange: { min: 1, max: 3 },
  },
  home_loan: {
    id: 'home_loan',
    label: 'Home loan',
    secured: true,
    baseRateRangeAnnual: { min: 8.0, max: 10.5 },
    tenureMonthsRange: { min: 60, max: 360 },
    comparisonTenuresMonths: [120, 180, 240, 300],
    processingFeePercentRange: { min: 0.25, max: 1 },
    maxLtvPercent: 80,
  },
  loan_against_property: {
    id: 'loan_against_property',
    label: 'Loan against property',
    secured: true,
    baseRateRangeAnnual: { min: 9.0, max: 13.5 },
    tenureMonthsRange: { min: 36, max: 180 },
    comparisonTenuresMonths: [60, 96, 120, 180],
    processingFeePercentRange: { min: 0.5, max: 1.5 },
    maxLtvPercent: 60,
  },
  gold_loan: {
    id: 'gold_loan',
    label: 'Gold loan',
    secured: true,
    baseRateRangeAnnual: { min: 9.0, max: 16 },
    tenureMonthsRange: { min: 3, max: 36 },
    comparisonTenuresMonths: [6, 12, 24, 36],
    processingFeePercentRange: { min: 0, max: 1 },
    maxLtvPercent: 75,
  },
  two_wheeler_loan: {
    id: 'two_wheeler_loan',
    label: 'Two-wheeler loan',
    secured: true,
    baseRateRangeAnnual: { min: 9.5, max: 18 },
    tenureMonthsRange: { min: 12, max: 48 },
    comparisonTenuresMonths: [12, 24, 36, 48],
    processingFeePercentRange: { min: 1, max: 3 },
    maxLtvPercent: 85,
  },
  business_loan: {
    id: 'business_loan',
    label: 'Business loan',
    secured: false,
    baseRateRangeAnnual: { min: 11, max: 24 },
    tenureMonthsRange: { min: 12, max: 60 },
    comparisonTenuresMonths: [24, 36, 48, 60],
    processingFeePercentRange: { min: 1, max: 2.5 },
  },
};

export function getLoanProduct(id: string): LoanProductProfile {
  const p = LOAN_PRODUCTS[id];
  if (!p) throw new Error(`Unknown loan product: ${id}`);
  return p;
}
