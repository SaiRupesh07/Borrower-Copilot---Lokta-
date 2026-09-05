import type { BorrowerProfile } from '../domain/borrower';
import type { StressTestResult } from '../domain/results';
import { ASSUMPTIONS } from '../data/assumptions';
import { resolveIncomePoint, safeMonthlyEmiCeiling } from './affordability';
import { formatINR } from '../utils/currency';

/** Recompute the safe EMI ceiling under an income-only shock. */
export function calculateStressTest(profile: BorrowerProfile): StressTestResult {
  const normal = safeMonthlyEmiCeiling(profile);

  const { point: netIncome } = resolveIncomePoint(profile);
  const stressedIncome = netIncome * (1 - ASSUMPTIONS.stress.incomeDropPercent);

  const stressedProfile: BorrowerProfile = {
    ...profile,
    netMonthlyIncome: { status: 'known', value: stressedIncome },
  };
  const stressed = safeMonthlyEmiCeiling(stressedProfile);

  const narrative = `Your safe EMI today is about ${formatINR(normal.value)}/month. If your income fell ${Math.round(
    ASSUMPTIONS.stress.incomeDropPercent * 100,
  )}%, your safer ceiling would fall to about ${formatINR(stressed.value)}/month. This test changes income only; it does not assume a rate shock.`;

  return {
    incomeDropPercent: ASSUMPTIONS.stress.incomeDropPercent * 100,
    ratePlusPercent: 0,
    normalSafeEmi: Math.round(normal.value),
    stressedSafeEmi: Math.round(stressed.value),
    narrative,
  };
}
