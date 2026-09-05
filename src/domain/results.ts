export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type Verdict = 'BORROW' | 'BORROW_LESS' | 'DONT_BORROW';

export interface NumberRange {
  min: number;
  max: number;
}

/** A calculated figure that always carries a plain-language explanation. */
export interface ExplainedValue<T> {
  value: T;
  why: string;
  confidence: ConfidenceLevel;
}

export interface VerdictResult {
  verdict: Verdict;
  headline: string; // one-sentence explanation for the UI
  reasons: string[]; // bullet-level contributing reasons, borrower-friendly
}

export interface AmountResult {
  /** What the borrower can safely repay, derived from affordability - not lender policy. */
  safeAmount: ExplainedValue<NumberRange>;
  /** A conservative single starting point: the lower end of the safe borrowing range. */
  recommendedSafeAmount: ExplainedValue<number>;
  /** Indicative estimate of what a lender might sanction. Explicitly not an approval. */
  likelyLenderSanction: ExplainedValue<NumberRange>;
}

export interface RateResult {
  fairRateAnnual: ExplainedValue<NumberRange>;
  factors: string[];
}

export interface AprResult {
  quotedRate?: number;
  processingFeePercent: number;
  assumedOtherFeesPercent: number;
  indicativeApr: ExplainedValue<NumberRange>;
  methodologyNote: string;
}

export interface EmiScenario {
  tenureMonths: number;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  exceedsSafeCeiling: boolean;
}

export interface EmiResult {
  safeMonthlyEmiCeiling: ExplainedValue<number>;
  recommendedTenureMonths: number;
  scenarios: EmiScenario[];
}

export interface StressTestResult {
  incomeDropPercent: number;
  ratePlusPercent: number;
  normalSafeEmi: number;
  stressedSafeEmi: number;
  narrative: string;
}

export interface AffordabilitySnapshot {
  usableMonthlyIncome: ExplainedValue<number>;
  foirCeilingPercent: number;
  monthlyRepaymentCapacity: number; // usableIncome * foir - existingEmis
  existingMonthlyEmi: number;
}

export interface RiskFlags {
  highCostExistingDebt: boolean;
  recentBounce: boolean;
  lowEmergencyBuffer: boolean;
  creditScoreUnknown: boolean;
  incomeUnverified: boolean;
  severeStress: boolean;
}

export interface BorrowerAssessment {
  verdict: VerdictResult;
  amount: AmountResult;
  rate: RateResult;
  apr: AprResult;
  emi: EmiResult;
  stress: StressTestResult;
  affordability: AffordabilitySnapshot;
  overallConfidence: ConfidenceLevel;
  riskFlags: RiskFlags;
  routing: {
    recommendedProductPath: string; // e.g. "Consider a secured/business loan against your shop property"
    note?: string;
  };
}
