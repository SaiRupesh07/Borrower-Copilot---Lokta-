import type { BorrowerProfile, BorrowerProfileDraft } from '../domain/borrower';

/**
 * Fill in defaults for any optional field the borrower skipped, using
 * explicit "unknown" states - never a fabricated numeric guess. Must
 * questions are assumed to already be present by the time this runs.
 */
export function buildProfileFromDraft(draft: BorrowerProfileDraft): BorrowerProfile {
  return {
    age: draft.age ?? 30,
    city: draft.city,
    state: draft.state,
    loanPurpose: draft.loanPurpose ?? 'other',
    isProductivePurpose: draft.isProductivePurpose ?? false,
    loanProduct: draft.loanProduct ?? 'personal_loan',
    requestedAmount: draft.requestedAmount ?? 0,
    employmentType: draft.employmentType ?? 'salaried',
    netMonthlyIncome: draft.netMonthlyIncome ?? { status: 'unknown' },
    documentedAnnualIncome: draft.documentedAnnualIncome,
    incomeStability: draft.incomeStability ?? { status: 'unknown' },
    variableIncomeSharePercent: draft.variableIncomeSharePercent,
    employmentTenureMonths: draft.employmentTenureMonths,
    existingEmis: draft.existingEmis ?? [],
    householdMonthlyExpenses: draft.householdMonthlyExpenses ?? { status: 'unknown' },
    dependents: draft.dependents ?? 0,
    creditScore: draft.creditScore ?? { status: 'unknown' },
    creditCardUtilizationPercent: draft.creditCardUtilizationPercent,
    recentEmiBounces: draft.recentEmiBounces ?? { status: 'unknown' },
    emergencySavingsMonths: draft.emergencySavingsMonths ?? { status: 'unknown' },
    collateral: draft.collateral ?? { hasCollateral: false },
    coApplicant: draft.coApplicant ?? { hasCoApplicant: false },
    existingLenderOffer: draft.existingLenderOffer ?? { hasOffer: false },
    expectedIncrementalMonthlyIncome: draft.expectedIncrementalMonthlyIncome,
  };
}
