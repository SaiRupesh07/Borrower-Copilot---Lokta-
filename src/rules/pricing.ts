import type { BorrowerProfile } from '../domain/borrower';
import type { AprResult, NumberRange, RateResult } from '../domain/results';
import { getLoanProduct } from '../data/loanProducts';
import { ASSUMPTIONS } from '../data/assumptions';
import { countPricingEvidenceGaps, gapsToConfidence } from './confidence';
import { hasHighCostExistingDebt } from './affordability';
import { calculateEmi } from './emi';

function creditScoreAdjustment(profile: BorrowerProfile): { min: number; max: number; note: string } {
  if (profile.creditScore.status === 'unknown') {
    return {
      min: ASSUMPTIONS.unknownCreditScoreWidenPercent.lower,
      max: ASSUMPTIONS.unknownCreditScoreWidenPercent.upper,
      note: 'no credit score was provided, so we widen the range instead of assuming a poor score',
    };
  }
  const score = profile.creditScore.value ?? 0;
  const band = ASSUMPTIONS.creditScoreAdjustment.find((b) => score >= b.min && score <= b.max);
  const adjust = band?.adjust ?? 0;
  return { min: adjust, max: adjust, note: `your self-reported credit score of ${score}` };
}

export function calculateFairRate(profile: BorrowerProfile): RateResult {
  const product = getLoanProduct(profile.loanProduct);
  const factors: string[] = [];

  let lowAdjust = 0;
  let highAdjust = 0;

  const credit = creditScoreAdjustment(profile);
  lowAdjust += credit.min;
  highAdjust += credit.max;
  factors.push(
    profile.creditScore.status === 'known'
      ? `Your self-reported credit score of ${profile.creditScore.value} shifts pricing ${credit.min < 0 ? 'down' : credit.min > 0 ? 'up' : 'in line with'} the base band.`
      : 'No credit score was provided: the range is widened rather than assuming a poor score.',
  );

  const stability = profile.incomeStability.status === 'known' ? profile.incomeStability.value : undefined;
  if (stability === 'highly_variable') {
    lowAdjust += ASSUMPTIONS.rateAdjustment.incomeHighlyVariable * 0.5;
    highAdjust += ASSUMPTIONS.rateAdjustment.incomeHighlyVariable;
    factors.push('Highly variable income pushes the upper end of the range higher.');
  } else if (stability === 'stable') {
    lowAdjust += ASSUMPTIONS.rateAdjustment.incomeStable;
    highAdjust += ASSUMPTIONS.rateAdjustment.incomeStable * 0.5;
    factors.push('Stable income supports the lower end of the range.');
  } else {
    highAdjust += ASSUMPTIONS.rateAdjustment.incomeHighlyVariable * 0.5;
    factors.push('Income stability unknown: upper end widened slightly.');
  }

  if (hasHighCostExistingDebt(profile)) {
    highAdjust += ASSUMPTIONS.rateAdjustment.existingHighCostDebt;
    factors.push('Existing high-cost debt pushes the upper end higher.');
  }

  if (profile.recentEmiBounces.status === 'known' && profile.recentEmiBounces.value > 0) {
    highAdjust += ASSUMPTIONS.rateAdjustment.recentBounce;
    factors.push('A recent missed EMI is a strong negative signal for pricing.');
  }

  if (profile.employmentType === 'self_employed' && profile.documentedAnnualIncome?.status === 'known') {
    lowAdjust += ASSUMPTIONS.rateAdjustment.documentedIncomeAvailable;
    factors.push('Documented (ITR) income supports better pricing than cash income alone.');
  }

  if (!product.secured && profile.collateral.hasCollateral) {
    lowAdjust += ASSUMPTIONS.rateAdjustment.hasCollateralForUnsecuredAsk;
    highAdjust += ASSUMPTIONS.rateAdjustment.hasCollateralForUnsecuredAsk;
    factors.push('Collateral you offered, even for an unsecured product, can support better pricing.');
  }

  if (profile.coApplicant.hasCoApplicant && (profile.coApplicant.monthlyIncome ?? 0) > 0) {
    lowAdjust += ASSUMPTIONS.rateAdjustment.coApplicantWithIncome;
    highAdjust += ASSUMPTIONS.rateAdjustment.coApplicantWithIncome;
    factors.push('A co-applicant with income modestly improves pricing.');
  }

  let min = product.baseRateRangeAnnual.min + lowAdjust;
  // Narrow the raw product band toward its lower half by default, then let
  // adjustments widen it - avoids always defaulting to the full (very
  // wide) product band regardless of borrower profile.
  let max = product.baseRateRangeAnnual.min + highAdjust + (product.baseRateRangeAnnual.max - product.baseRateRangeAnnual.min) * 0.35;
  if (max < min + 0.5) max = min + 0.5;
  min = Math.max(product.baseRateRangeAnnual.min - 1, Math.min(min, product.baseRateRangeAnnual.max));
  max = Math.min(product.baseRateRangeAnnual.max + 2, Math.max(max, min + 0.5));

  const gaps = countPricingEvidenceGaps(profile);
  const confidence = gapsToConfidence(gaps);

  const range: NumberRange = { min: Math.round(min * 20) / 20, max: Math.round(max * 20) / 20 };

  return {
    fairRateAnnual: {
      value: range,
      why: `Starting from the indicative market band for a ${product.label.toLowerCase()} and adjusting for your credit and income evidence.`,
      confidence,
    },
    factors,
  };
}

/**
 * Solve a periodic IRR from equally spaced cash flows. The first cash flow is
 * the lender's net disbursement (negative from the lender's perspective).
 * Bisection is deliberately used instead of Newton-Raphson so unusual but
 * valid fee/rate combinations cannot make the estimate diverge.
 */
export function calculatePeriodicIrr(cashFlows: number[]): number | undefined {
  if (
    cashFlows.length < 2 ||
    cashFlows.some((cashFlow) => !Number.isFinite(cashFlow)) ||
    cashFlows[0] >= 0 ||
    !cashFlows.slice(1).some((cashFlow) => cashFlow > 0)
  ) {
    return undefined;
  }

  const npv = (periodicRate: number): number =>
    cashFlows.reduce((total, cashFlow, period) => total + cashFlow / Math.pow(1 + periodicRate, period), 0);

  let lower = -0.999999;
  let upper = 1;
  const lowerValue = npv(lower);
  let upperValue = npv(upper);
  while (upperValue > 0 && upper < 1_000_000) {
    upper *= 2;
    upperValue = npv(upper);
  }
  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue) || lowerValue * upperValue > 0) return undefined;

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const midpointValue = npv(midpoint);
    if (!Number.isFinite(midpointValue)) return undefined;
    if (Math.abs(midpointValue) < 1e-8) return midpoint;
    if (midpointValue > 0) lower = midpoint;
    else upper = midpoint;
  }
  return (lower + upper) / 2;
}

function fallbackApr(nominalRate: number, feePercent: number, tenureMonths: number): number {
  const tenureYears = Math.max(tenureMonths / 12, 1 / 12);
  return nominalRate + feePercent / tenureYears;
}

function computeCashFlowApr(
  principal: number,
  nominalRate: number,
  tenureMonths: number,
  upfrontFeePercent: number,
): number | undefined {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(nominalRate) || tenureMonths <= 0) return undefined;
  const netDisbursement = principal * (1 - upfrontFeePercent / 100);
  if (netDisbursement <= 0) return undefined;
  const emi = calculateEmi(principal, nominalRate, tenureMonths);
  if (!Number.isFinite(emi) || emi <= 0) return undefined;
  const monthlyIrr = calculatePeriodicIrr([-netDisbursement, ...Array.from({ length: tenureMonths }, () => emi)]);
  if (monthlyIrr === undefined || monthlyIrr <= -1) return undefined;
  return (Math.pow(1 + monthlyIrr, 12) - 1) * 100;
}

export function calculateApr(profile: BorrowerProfile, fairRate: RateResult, recommendedTenureMonths: number): AprResult {
  const product = getLoanProduct(profile.loanProduct);
  const quotedRate = profile.existingLenderOffer.hasOffer ? profile.existingLenderOffer.quotedInterestRate : undefined;
  const processingFeePercent = profile.existingLenderOffer.hasOffer && profile.existingLenderOffer.processingFeePercent !== undefined
    ? profile.existingLenderOffer.processingFeePercent
    : (product.processingFeePercentRange.min + product.processingFeePercentRange.max) / 2;

  const otherFees = ASSUMPTIONS.assumedOtherFeesPercent;
  const tenureMonths =
    profile.existingLenderOffer.hasOffer && profile.existingLenderOffer.quotedTenureMonths !== undefined
      ? Math.max(1, Math.round(profile.existingLenderOffer.quotedTenureMonths))
      : Math.max(1, Math.round(recommendedTenureMonths));
  const upfrontFeePercent = processingFeePercent + otherFees;

  const computeAprFor = (nominalRate: number) => {
    return (
      computeCashFlowApr(profile.requestedAmount, nominalRate, tenureMonths, upfrontFeePercent) ??
      fallbackApr(nominalRate, upfrontFeePercent, tenureMonths)
    );
  };

  const low = computeAprFor(quotedRate ?? fairRate.fairRateAnnual.value.min);
  const high = computeAprFor(quotedRate ?? fairRate.fairRateAnnual.value.max);

  return {
    quotedRate,
    processingFeePercent: Math.round(processingFeePercent * 10) / 10,
    assumedOtherFeesPercent: otherFees,
    indicativeApr: {
      value: { min: Math.round(low * 20) / 20, max: Math.round(high * 20) / 20 },
      why: `Periodic cash-flow IRR for a ${tenureMonths}-month amortising schedule after ${processingFeePercent.toFixed(
        1,
      )}% processing fees and an assumed ${otherFees}% for documentation/insurance-type costs.`,
      confidence: fairRate.fairRateAnnual.confidence,
    },
    methodologyNote:
      'This indicative APR annualises the monthly IRR of the net amount disbursed after upfront fees and the scheduled monthly repayments. It is a periodic cash-flow estimate, not a regulator-certified APR or XIRR disclosure. If the amount is invalid or the IRR cannot be bracketed, the engine falls back to nominal rate plus the fee load spread over the tenure; ask the lender for the exact APR before signing.',
  };
}
