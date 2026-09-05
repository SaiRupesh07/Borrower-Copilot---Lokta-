import type { BorrowerProfile } from '../domain/borrower';
import type { AmountResult, ExplainedValue, NumberRange, RateResult } from '../domain/results';
import { getLoanProduct } from '../data/loanProducts';
import { ASSUMPTIONS } from '../data/assumptions';
import { safeMonthlyEmiCeiling, resolveIncomePoint } from './affordability';
import { maxTenureForAge } from './emi';
import { countAmountEvidenceGaps, gapsToConfidence, weakestConfidence } from './confidence';

/** Reverse the EMI formula to find principal supportable by a given EMI. */
export function principalFromEmi(emi: number, annualRatePercent: number, months: number): number {
  if (emi <= 0 || months <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return emi * months;
  const factor = Math.pow(1 + r, months);
  return (emi * (factor - 1)) / (r * factor);
}

function collateralEffectiveValue(profile: BorrowerProfile): number {
  const c = profile.collateral;
  if (!c.hasCollateral || c.estimatedValue?.status !== 'known') return 0;
  let value = c.estimatedValue.value;
  if (c.existingEncumbrance === 'partial') value *= 1 - ASSUMPTIONS.collateralHaircut.partialEncumbrance;
  if (c.existingEncumbrance === 'full') value *= 1 - ASSUMPTIONS.collateralHaircut.fullEncumbrance;
  if (c.ownershipClear?.status !== 'known' || c.ownershipClear.value === false) {
    value *= 1 - ASSUMPTIONS.collateralHaircut.ownershipUnknown;
  }
  return Math.max(0, value);
}

/** Safe borrower amount: derived purely from affordability, never from lender policy. */
export function calculateSafeAmount(profile: BorrowerProfile, fairRate: RateResult): ExplainedValue<NumberRange> {
  const product = getLoanProduct(profile.loanProduct);
  const ceiling = safeMonthlyEmiCeiling(profile);
  const maxTenure = maxTenureForAge(profile, product.tenureMonthsRange.max);
  const minTenure = product.tenureMonthsRange.min;

  // Conservative combo (shorter tenure, higher rate) -> lower bound.
  const low = principalFromEmi(ceiling.value, fairRate.fairRateAnnual.value.max, minTenure);
  // Generous-but-still-safe combo (longer tenure, lower rate) -> upper bound.
  const high = principalFromEmi(ceiling.value, fairRate.fairRateAnnual.value.min, maxTenure);

  const min = Math.max(0, Math.min(low, high));
  const max = Math.max(0, Math.max(low, high));

  const gaps = countAmountEvidenceGaps(profile);
  const confidence = weakestConfidence(gapsToConfidence(gaps), ceiling.confidence, fairRate.fairRateAnnual.confidence);

  return {
    value: { min, max },
    why: `Based on a safe EMI of up to ${Math.round(ceiling.value).toLocaleString('en-IN')}/month (see Safe EMI ceiling) at your fair rate range across a ${minTenure}-${maxTenure} month tenure window, this is what you could safely repay - not what a lender might approve.`,
    confidence,
  };
}

/** Indicative lender-like sanction, kept explicitly separate from safe amount. */
export function calculateLikelyLenderSanction(profile: BorrowerProfile, fairRate: RateResult): ExplainedValue<NumberRange> {
  const product = getLoanProduct(profile.loanProduct);
  const { point: netIncome, wasRange } = resolveIncomePoint(profile);
  const maxTenure = maxTenureForAge(profile, product.tenureMonthsRange.max);
  const gaps = countAmountEvidenceGaps(profile);
  const confidence = gapsToConfidence(gaps + (wasRange ? 1 : 0));

  if (product.secured && product.maxLtvPercent) {
    const collateralValue = collateralEffectiveValue(profile);
    if (collateralValue > 0) {
      const ltvBased = collateralValue * (product.maxLtvPercent / 100);
      // Lenders also cross-check against an income-based EMI capacity using
      // their own (looser) FOIR assumption - take the lower of the two.
      const lenderFoirCapacity =
        netIncome * ASSUMPTIONS.lenderFoirAssumption -
        profile.existingEmis.reduce((s, l) => s + l.emi, 0);
      const incomeBasedPrincipal = principalFromEmi(
        Math.max(0, lenderFoirCapacity),
        fairRate.fairRateAnnual.value.max,
        maxTenure,
      );
      // A secured lender still needs the borrower to be able to repay the
      // debt. Collateral LTV is a ceiling, never a guaranteed minimum.
      const capped = Math.min(ltvBased, incomeBasedPrincipal);
      return {
        value: { min: Math.round(capped * 0.85), max: Math.round(capped) },
        why: `Indicative lender-like estimate using up to ${product.maxLtvPercent}% of your collateral's assessed value (after adjusting for encumbrance/ownership evidence), cross-checked against income-based repayment capacity. Not an approval.`,
        confidence,
      };
    }
    // Secured product but no usable collateral info yet - fall through to income-based estimate with LOW confidence.
  }

  // Unsecured (or secured-without-collateral-data): income-multiple approach.
  const multiple = ASSUMPTIONS.unsecuredSanctionIncomeMultiple[profile.employmentType];
  const incomeForSanction =
    profile.employmentType === 'self_employed' && profile.documentedAnnualIncome?.status === 'known'
      ? profile.documentedAnnualIncome.value / 12
      : netIncome * (1 - (profile.employmentType !== 'salaried' ? ASSUMPTIONS.incomeHaircut.undocumentedForLenderView : 0));

  const multipleBased = incomeForSanction * multiple;
  const lenderFoirCapacity = Math.max(
    0,
    netIncome * ASSUMPTIONS.lenderFoirAssumption - profile.existingEmis.reduce((s, l) => s + l.emi, 0),
  );
  const foirBasedPrincipal = principalFromEmi(lenderFoirCapacity, fairRate.fairRateAnnual.value.max, maxTenure);

  const high = Math.min(multipleBased, foirBasedPrincipal);
  const low = high * 0.7;

  return {
    value: { min: Math.max(0, Math.round(low)), max: Math.max(0, Math.round(high)) },
    why: `Indicative lender-like estimate based on a typical income multiple for ${profile.employmentType.replace('_', ' ')} borrowers, capped by an EMI-based check at a looser lender FOIR assumption. Not an approval - actual sanction depends on the lender's own policy and verification.`,
    confidence,
  };
}

export function calculateAmountResult(profile: BorrowerProfile, fairRate: RateResult): AmountResult {
  const safeAmount = calculateSafeAmount(profile, fairRate);
  const recommendedSafeAmount = Math.min(
    safeAmount.value.max,
    Math.max(safeAmount.value.min, Math.ceil(safeAmount.value.min)),
  );
  return {
    safeAmount,
    recommendedSafeAmount: {
      value: recommendedSafeAmount,
      why: `Use the conservative lower end of your safe borrowing range (${Math.round(
        safeAmount.value.min,
      ).toLocaleString('en-IN')}) as a starting point. It does not include the lender's separate sanction estimate.`,
      confidence: safeAmount.confidence,
    },
    likelyLenderSanction: calculateLikelyLenderSanction(profile, fairRate),
  };
}
