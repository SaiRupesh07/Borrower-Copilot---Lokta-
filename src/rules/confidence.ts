import type { BorrowerProfile } from '../domain/borrower';
import type { ConfidenceLevel } from '../domain/results';
import { ASSUMPTIONS } from '../data/assumptions';

/**
 * Count "evidence gaps" - pieces of information that, if known, would let
 * us narrow a range or firm up an assumption. More gaps => lower
 * confidence. This function never invents a value for a gap; it only
 * counts it.
 */
export function countIncomeEvidenceGaps(profile: BorrowerProfile): number {
  let gaps = 0;
  if (profile.netMonthlyIncome.status !== 'known') gaps += 1;
  if (profile.incomeStability.status === 'unknown') gaps += 1;
  if (profile.employmentType === 'self_employed' && !profile.documentedAnnualIncome) gaps += 1;
  if (
    profile.employmentType === 'self_employed' &&
    profile.documentedAnnualIncome?.status === 'unknown'
  ) {
    gaps += 1;
  }
  if (profile.householdMonthlyExpenses.status === 'unknown') gaps += 1;
  return gaps;
}

export function countPricingEvidenceGaps(profile: BorrowerProfile): number {
  let gaps = 0;
  if (profile.creditScore.status === 'unknown') gaps += 1;
  if (profile.incomeStability.status === 'unknown') gaps += 1;
  if (profile.recentEmiBounces.status === 'unknown') gaps += 1;
  if (profile.employmentType === 'self_employed' && !profile.documentedAnnualIncome) gaps += 1;
  return gaps;
}

export function countAmountEvidenceGaps(profile: BorrowerProfile): number {
  let gaps = 0;
  if (profile.netMonthlyIncome.status !== 'known') gaps += 1;
  if (profile.householdMonthlyExpenses.status === 'unknown') gaps += 1;
  if (profile.emergencySavingsMonths === undefined || profile.emergencySavingsMonths.status === 'unknown') {
    gaps += 1;
  }
  if (profile.collateral.hasCollateral && profile.collateral.estimatedValue?.status !== 'known') {
    gaps += 1;
  }
  return gaps;
}

export function gapsToConfidence(gaps: number): ConfidenceLevel {
  if (gaps <= ASSUMPTIONS.confidenceThresholds.highMaxGaps) return 'HIGH';
  if (gaps <= ASSUMPTIONS.confidenceThresholds.mediumMaxGaps) return 'MEDIUM';
  return 'LOW';
}

export function weakestConfidence(...levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.includes('LOW')) return 'LOW';
  if (levels.includes('MEDIUM')) return 'MEDIUM';
  return 'HIGH';
}
