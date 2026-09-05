import type { BorrowerProfile } from '../domain/borrower';
import type { AffordabilitySnapshot, ExplainedValue, RiskFlags, ConfidenceLevel } from '../domain/results';
import { ASSUMPTIONS } from '../data/assumptions';
import { safeNonNegative } from '../utils/validation';
import { formatINR } from '../utils/currency';
import { countIncomeEvidenceGaps, gapsToConfidence } from './confidence';

/** Resolve a KnownOrRange<number> income field to a single point estimate + note. */
export function resolveIncomePoint(profile: BorrowerProfile): { point: number; wasRange: boolean } {
  const inc = profile.netMonthlyIncome;
  if (inc.status === 'known') return { point: safeNonNegative(inc.value), wasRange: false };
  if (inc.status === 'range') {
    const mid = (safeNonNegative(inc.min) + safeNonNegative(inc.max)) / 2;
    return { point: mid, wasRange: true };
  }
  return { point: 0, wasRange: true };
}

export function totalExistingMonthlyEmi(profile: BorrowerProfile): number {
  return profile.existingEmis.reduce((sum, l) => sum + safeNonNegative(l.emi), 0);
}

export function hasHighCostExistingDebt(profile: BorrowerProfile): boolean {
  return profile.existingEmis.some(
    (l) => l.isHighCost || (l.interestRate !== undefined && l.interestRate >= 30),
  );
}

export function computeRiskFlags(profile: BorrowerProfile, existingFoirUtilisation: number): RiskFlags {
  const lowBuffer =
    profile.emergencySavingsMonths?.status === 'known' &&
    profile.emergencySavingsMonths.value < ASSUMPTIONS.lowEmergencyBufferThresholdMonths;

  const recentBounce =
    profile.recentEmiBounces.status === 'known' && profile.recentEmiBounces.value > 0;

  const highCost = hasHighCostExistingDebt(profile);

  return {
    highCostExistingDebt: highCost,
    recentBounce,
    lowEmergencyBuffer: Boolean(lowBuffer),
    creditScoreUnknown: profile.creditScore.status === 'unknown',
    incomeUnverified:
      profile.netMonthlyIncome.status !== 'known' ||
      (profile.employmentType === 'self_employed' && !profile.documentedAnnualIncome),
    severeStress: (highCost && recentBounce) || existingFoirUtilisation >= ASSUMPTIONS.verdict.alreadyOverExtendedForir,
  };
}

/** Base FOIR ceiling for the borrower's employment/stability profile, before penalties. */
export function baseFoirCeiling(profile: BorrowerProfile): number {
  if (profile.employmentType === 'salaried') {
    return profile.incomeStability.status === 'known' && profile.incomeStability.value !== 'stable'
      ? ASSUMPTIONS.foirCeiling.salariedVariable
      : ASSUMPTIONS.foirCeiling.salariedStable;
  }
  if (profile.employmentType === 'self_employed') return ASSUMPTIONS.foirCeiling.selfEmployed;
  return ASSUMPTIONS.foirCeiling.informal;
}

export function applyForPenalties(base: number, flags: Pick<RiskFlags, 'highCostExistingDebt' | 'recentBounce' | 'lowEmergencyBuffer'>): number {
  let foir = base;
  if (flags.highCostExistingDebt) foir -= ASSUMPTIONS.foirPenalty.highCostExistingDebt;
  if (flags.recentBounce) foir -= ASSUMPTIONS.foirPenalty.recentBounce;
  if (flags.lowEmergencyBuffer) foir -= ASSUMPTIONS.foirPenalty.lowEmergencyBuffer;
  return Math.max(ASSUMPTIONS.foirFloor, foir);
}

/** Usable monthly income after stability/range-uncertainty haircuts. */
export function usableMonthlyIncome(profile: BorrowerProfile): ExplainedValue<number> {
  const { point, wasRange } = resolveIncomePoint(profile);
  let haircut = 0;
  const stability = profile.incomeStability.status === 'known' ? profile.incomeStability.value : undefined;
  if (stability === 'somewhat_variable') haircut += ASSUMPTIONS.incomeHaircut.somewhat_variable;
  else if (stability === 'highly_variable') haircut += ASSUMPTIONS.incomeHaircut.highly_variable;
  else if (stability === undefined) haircut += ASSUMPTIONS.incomeHaircut.somewhat_variable; // unknown stability treated conservatively, not as "stable"

  if (wasRange) haircut += ASSUMPTIONS.incomeHaircut.rangeUncertainty;
  haircut = Math.min(haircut, 0.6);

  const usable = point * (1 - haircut);
  const gaps = countIncomeEvidenceGaps(profile);
  const confidence: ConfidenceLevel = gapsToConfidence(gaps);

  const parts: string[] = [];
  parts.push(`Starting from ${wasRange ? 'the midpoint of your stated income range' : 'your stated net income'} of ${formatINR(point)}/month`);
  if (haircut > 0) parts.push(`we set aside ${Math.round(haircut * 100)}% to reflect ${wasRange ? 'the uncertainty in an income range' : ''}${wasRange && stability !== 'stable' ? ' and ' : ''}${stability !== 'stable' ? 'income variability' : ''}`.replace(/\s+/g, ' ').trim());
  parts.push(`leaving ${formatINR(usable)}/month we treat as reliably usable income.`);

  return { value: usable, why: parts.join(', ').replace(', leaving', ', leaving'), confidence };
}

export function computeAffordability(profile: BorrowerProfile): {
  affordability: AffordabilitySnapshot;
  riskFlags: RiskFlags;
} {
  const usable = usableMonthlyIncome(profile);
  const existingEmi = totalExistingMonthlyEmi(profile);
  const existingFoirUtilisation = usable.value > 0 ? existingEmi / usable.value : 1;
  const riskFlagsWithoutSevere = computeRiskFlags(profile, existingFoirUtilisation);
  const foirCeiling = applyForPenalties(baseFoirCeiling(profile), riskFlagsWithoutSevere);

  const repaymentCapacity = Math.max(0, usable.value * foirCeiling - existingEmi);

  return {
    affordability: {
      usableMonthlyIncome: usable,
      foirCeilingPercent: Math.round(foirCeiling * 1000) / 10,
      monthlyRepaymentCapacity: repaymentCapacity,
      existingMonthlyEmi: existingEmi,
    },
    riskFlags: riskFlagsWithoutSevere,
  };
}

/**
 * Safe monthly EMI ceiling for a NEW loan: the lower of (a) FOIR-based
 * repayment capacity and (b) what's actually left over after essential
 * expenses, existing EMI, and a safety buffer. Taking the minimum of the
 * two methods is deliberately conservative.
 */
export function safeMonthlyEmiCeiling(profile: BorrowerProfile): ExplainedValue<number> {
  const { affordability } = computeAffordability(profile);
  const existingEmi = affordability.existingMonthlyEmi;
  const { point: netIncome } = resolveIncomePoint(profile);

  const foirBasedCapacity = affordability.monthlyRepaymentCapacity;

  let expenseBasedCapacity = foirBasedCapacity; // fallback if expenses unknown
  let expenseNote = '';
  if (profile.householdMonthlyExpenses.status === 'known') {
    const buffer = netIncome * ASSUMPTIONS.safetyBufferPercentOfIncome;
    expenseBasedCapacity = Math.max(
      0,
      netIncome - profile.householdMonthlyExpenses.value - existingEmi - buffer,
    );
    expenseNote = ` and after your household expenses of ${formatINR(profile.householdMonthlyExpenses.value)} and a ${Math.round(ASSUMPTIONS.safetyBufferPercentOfIncome * 100)}% safety buffer, about ${formatINR(expenseBasedCapacity)} is left over`;
  }

  const ceiling = Math.max(0, Math.min(foirBasedCapacity, expenseBasedCapacity));
  const gaps = countIncomeEvidenceGaps(profile);
  const confidence = gapsToConfidence(gaps);

  const why =
    `Applying a ${affordability.foirCeilingPercent}% debt-service ceiling to your usable income of ${formatINR(affordability.usableMonthlyIncome.value)}/month, minus your existing EMI of ${formatINR(existingEmi)}, gives ${formatINR(foirBasedCapacity)}${expenseNote}. ` +
    `We use the more conservative of the two: ${formatINR(ceiling)}/month.`;

  return { value: ceiling, why, confidence };
}
