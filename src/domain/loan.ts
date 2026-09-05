import type { LoanProductType } from './borrower';

/** Indicative, product-level assumptions. Values documented in RULES.md. */
export interface LoanProductProfile {
  id: LoanProductType;
  label: string;
  secured: boolean;
  /** Indicative annual rate band lenders quote in the current market, before borrower-specific adjustment. */
  baseRateRangeAnnual: { min: number; max: number };
  /** Typical tenure bounds offered for this product, in months. */
  tenureMonthsRange: { min: number; max: number };
  /** Tenure options shown for comparison in the EMI ceiling output. */
  comparisonTenuresMonths: number[];
  /** Typical processing fee band, % of loan amount. */
  processingFeePercentRange: { min: number; max: number };
  /** Maximum loan-to-value lenders typically extend against collateral (secured products only). */
  maxLtvPercent?: number;
}
