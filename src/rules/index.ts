import type { BorrowerProfile } from '../domain/borrower';
import type { BorrowerAssessment, VerdictResult } from '../domain/results';
import { ASSUMPTIONS } from '../data/assumptions';
import { computeAffordability } from './affordability';
import { calculateFairRate, calculateApr } from './pricing';
import { calculateEmi, buildEmiResult } from './emi';
import { calculateAmountResult } from './eligibility';
import { calculateStressTest } from './stress';
import { calculateRouting } from './routing';
import { weakestConfidence } from './confidence';
import { formatINR } from '../utils/currency';

function buildVerdict(
  profile: BorrowerProfile,
  requestedEmi: number,
  safeCeiling: number,
  riskFlags: BorrowerAssessment['riskFlags'],
): VerdictResult {
  const reasons: string[] = [];

  if (riskFlags.severeStress) {
    if (riskFlags.recentBounce) reasons.push('You have had a missed/bounced EMI in the last 6 months.');
    if (riskFlags.highCostExistingDebt) reasons.push('You are already repaying high-cost debt (30%+ effective interest).');
    if (!riskFlags.recentBounce && !riskFlags.highCostExistingDebt) {
      reasons.push('Your existing EMI already uses up almost all of your safe repayment capacity.');
    }
    return {
      verdict: 'DONT_BORROW',
      headline:
        "Don't borrow right now: your current repayment obligations already leave little to no safe room for a new EMI, and taking on more debt would add real risk of missing payments.",
      reasons,
    };
  }

  if (requestedEmi > safeCeiling * ASSUMPTIONS.verdict.borrowLessThreshold && safeCeiling > 0) {
    reasons.push(
      `The EMI needed for ${formatINR(profile.requestedAmount)} (about ${formatINR(requestedEmi)}/month) is above your safe ceiling of ${formatINR(safeCeiling)}/month.`,
    );
    if (!profile.isProductivePurpose) {
      reasons.push('This is a discretionary (non-income-generating) purpose, so extra caution is warranted.');
    }
    return {
      verdict: 'BORROW_LESS',
      headline:
        'Borrow less: the requested loan would push your monthly debt outflow above your safe affordability ceiling.',
      reasons,
    };
  }

  if (safeCeiling <= 0) {
    reasons.push('Your usable income after existing commitments does not currently support a new EMI.');
    return {
      verdict: 'DONT_BORROW',
      headline: "Don't borrow right now: there isn't safe room in your monthly budget for a new EMI.",
      reasons,
    };
  }

  reasons.push(`The EMI needed for ${formatINR(profile.requestedAmount)} fits within your safe ceiling of ${formatINR(safeCeiling)}/month.`);
  if (profile.isProductivePurpose) reasons.push('This is a productive purpose, which supports the case for borrowing.');

  return {
    verdict: 'BORROW',
    headline: 'Borrow: the requested amount fits comfortably within what you can safely repay each month.',
    reasons,
  };
}

export function calculateBorrowerAssessment(profile: BorrowerProfile): BorrowerAssessment {
  const { affordability, riskFlags } = computeAffordability(profile);
  const fairRate = calculateFairRate(profile);
  const fairRateMidpoint = (fairRate.fairRateAnnual.value.min + fairRate.fairRateAnnual.value.max) / 2;

  const emi = buildEmiResult(profile, fairRateMidpoint);
  const apr = calculateApr(profile, fairRate, emi.recommendedTenureMonths);
  const amount = calculateAmountResult(profile, fairRate);
  const stress = calculateStressTest(profile);
  const routing = calculateRouting(profile);

  const requestedEmi = calculateEmi(profile.requestedAmount, fairRateMidpoint, emi.recommendedTenureMonths);
  const verdict = buildVerdict(profile, requestedEmi, emi.safeMonthlyEmiCeiling.value, riskFlags);

  const overallConfidence = weakestConfidence(
    affordability.usableMonthlyIncome.confidence,
    fairRate.fairRateAnnual.confidence,
    amount.safeAmount.confidence,
    emi.safeMonthlyEmiCeiling.confidence,
  );

  return {
    verdict,
    amount,
    rate: fairRate,
    apr,
    emi,
    stress,
    affordability,
    overallConfidence,
    riskFlags,
    routing,
  };
}

export * from './affordability';
export * from './pricing';
export * from './emi';
export * from './eligibility';
export * from './stress';
export * from './routing';
export * from './confidence';
