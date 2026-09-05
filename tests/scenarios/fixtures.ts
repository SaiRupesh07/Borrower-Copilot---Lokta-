import type { BorrowerProfile } from '../../src/domain/borrower';

// These fixtures translate the exact scenario text from the brief into
// BorrowerProfile objects. Where the brief did not state a field exactly
// (e.g. Priya's income stability, Anita's app-loan monthly EMI), a
// reasonable, documented assumption is made - see docs/THREE_RUNTHROUGHS.md.

export const PRIYA: BorrowerProfile = {
  age: 29,
  city: 'Bengaluru',
  loanPurpose: 'wedding',
  isProductivePurpose: false,
  loanProduct: 'personal_loan',
  requestedAmount: 800000,
  employmentType: 'salaried',
  netMonthlyIncome: { status: 'known', value: 110000 },
  incomeStability: { status: 'known', value: 'stable' },
  employmentTenureMonths: 60,
  existingEmis: [{ type: 'vehicle', emi: 14000, remainingTenureMonths: 24, isHighCost: false }],
  householdMonthlyExpenses: { status: 'known', value: 28000 },
  dependents: 0,
  creditScore: { status: 'known', value: 780 },
  recentEmiBounces: { status: 'known', value: 0 },
  emergencySavingsMonths: { status: 'unknown' },
  collateral: { hasCollateral: false },
  coApplicant: { hasCoApplicant: false },
  existingLenderOffer: { hasOffer: false },
};

export const RAVI: BorrowerProfile = {
  age: 42,
  city: 'Mysuru',
  loanPurpose: 'business_expansion',
  isProductivePurpose: true,
  loanProduct: 'personal_loan', // Ravi's own initial ask - routing should redirect him
  requestedAmount: 1500000,
  employmentType: 'self_employed',
  netMonthlyIncome: { status: 'range', min: 40000, max: 80000 },
  documentedAnnualIncome: { status: 'known', value: 420000 },
  incomeStability: { status: 'known', value: 'highly_variable' },
  employmentTenureMonths: 14 * 12,
  existingEmis: [],
  householdMonthlyExpenses: { status: 'unknown' },
  dependents: 2,
  creditScore: { status: 'unknown' },
  recentEmiBounces: { status: 'unknown' },
  emergencySavingsMonths: { status: 'unknown' },
  collateral: {
    hasCollateral: true,
    type: 'property',
    estimatedValue: { status: 'known', value: 4500000 },
    existingEncumbrance: 'none',
    ownershipClear: { status: 'known', value: true },
  },
  coApplicant: { hasCoApplicant: true, monthlyIncome: 18000 },
  existingLenderOffer: { hasOffer: false },
  expectedIncrementalMonthlyIncome: undefined,
};

export const ANITA: BorrowerProfile = {
  age: 35,
  city: 'Hubballi',
  loanPurpose: 'vehicle',
  isProductivePurpose: true, // scooter could increase delivery income
  loanProduct: 'two_wheeler_loan',
  requestedAmount: 150000,
  employmentType: 'informal',
  netMonthlyIncome: { status: 'range', min: 26000, max: 30000 },
  incomeStability: { status: 'known', value: 'highly_variable' },
  existingEmis: [
    { type: 'app_loan', emi: 6000, isHighCost: true, interestRate: 32 },
  ],
  householdMonthlyExpenses: { status: 'unknown' },
  dependents: 2,
  creditScore: { status: 'unknown' },
  recentEmiBounces: { status: 'known', value: 1 },
  emergencySavingsMonths: { status: 'known', value: 0 },
  collateral: { hasCollateral: false },
  coApplicant: { hasCoApplicant: false },
  existingLenderOffer: { hasOffer: false },
  expectedIncrementalMonthlyIncome: undefined,
};
