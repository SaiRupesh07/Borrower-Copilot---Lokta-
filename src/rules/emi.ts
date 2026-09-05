import type { EmiResult, EmiScenario } from '../domain/results';
import type { BorrowerProfile } from '../domain/borrower';
import { getLoanProduct } from '../data/loanProducts';
import { ASSUMPTIONS } from '../data/assumptions';
import { safeMonthlyEmiCeiling } from './affordability';

/** Standard reducing-balance EMI formula. Returns 0 for non-positive principal. */
export function calculateEmi(principal: number, annualRatePercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePercent / 12 / 100;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function totalPayable(emi: number, months: number): number {
  return emi * months;
}

export function maxTenureForAge(profile: BorrowerProfile, productMaxMonths: number): number {
  const yearsToMaturityCap = ASSUMPTIONS.maxAgeAtLoanMaturity - profile.age;
  if (yearsToMaturityCap <= 0) return Math.min(12, productMaxMonths); // very short fallback tenure
  return Math.min(productMaxMonths, Math.max(12, yearsToMaturityCap * 12));
}

export function buildEmiResult(
  profile: BorrowerProfile,
  fairRateMidpoint: number,
): EmiResult {
  const product = getLoanProduct(profile.loanProduct);
  const ceiling = safeMonthlyEmiCeiling(profile);
  const cappedMaxTenure = maxTenureForAge(profile, product.tenureMonthsRange.max);

  const candidateTenures = product.comparisonTenuresMonths.filter((t) => t <= cappedMaxTenure);
  if (candidateTenures.length === 0) candidateTenures.push(Math.min(12, cappedMaxTenure));

  const scenarios: EmiScenario[] = candidateTenures.map((tenureMonths) => {
    const emi = calculateEmi(profile.requestedAmount, fairRateMidpoint, tenureMonths);
    const interestPaid = totalPayable(emi, tenureMonths) - profile.requestedAmount;
    return {
      tenureMonths,
      emi: Math.round(emi),
      totalInterest: Math.round(Math.max(0, interestPaid)),
      totalPayable: Math.round(totalPayable(emi, tenureMonths)),
      exceedsSafeCeiling: emi > ceiling.value * 1.0001,
    };
  });

  // Recommend the shortest tenure that still fits under the safe ceiling;
  // if none fit, recommend the longest available (still flagged as
  // exceeding) so the borrower sees the closest achievable option.
  const fitting = scenarios.filter((s) => !s.exceedsSafeCeiling);
  const recommended = fitting.length > 0 ? fitting[0] : scenarios[scenarios.length - 1];

  return {
    safeMonthlyEmiCeiling: ceiling,
    recommendedTenureMonths: recommended.tenureMonths,
    scenarios,
  };
}
