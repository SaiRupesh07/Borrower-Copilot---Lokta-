import type { BorrowerProfile } from '../domain/borrower';

export function calculateRouting(profile: BorrowerProfile): { recommendedProductPath: string; note?: string } {
  const hasUsableCollateral = profile.collateral.hasCollateral && profile.collateral.existingEncumbrance !== 'full';

  if (
    profile.employmentType === 'self_employed' &&
    profile.loanProduct === 'personal_loan' &&
    hasUsableCollateral &&
    profile.isProductivePurpose
  ) {
    return {
      recommendedProductPath:
        'Given your business collateral and productive purpose, a secured loan against property or a business loan is likely to be cheaper and more achievable than an unsecured personal loan.',
      note: 'Consider asking lenders specifically about Loan Against Property or MSME/business loan schemes rather than a standard personal loan.',
    };
  }

  if (profile.employmentType === 'self_employed' && hasUsableCollateral && profile.loanProduct !== 'loan_against_property') {
    return {
      recommendedProductPath:
        'Your collateral could unlock materially better pricing and a larger sanction through a secured product.',
    };
  }

  if (profile.employmentType === 'informal' && !profile.isProductivePurpose) {
    return {
      recommendedProductPath:
        'For informal income without collateral, small-ticket secured options (e.g. gold loan) are typically cheaper than unsecured or app-based credit.',
    };
  }

  return {
    recommendedProductPath: `Your selected product (${profile.loanProduct.replace(/_/g, ' ')}) is a reasonable starting point given your profile.`,
  };
}
