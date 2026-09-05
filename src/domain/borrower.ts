// Borrower domain model.
//
// Design principle: nothing that is "unknown" is ever represented by a
// sentinel numeric value (0, -1, 300, etc). Every field that can be
// legitimately unknown to the borrower is modelled as a tagged union with
// an explicit "unknown" branch. Downstream rules must handle that branch
// on purpose - the type system makes it impossible to silently coerce
// "unknown" into "worst case" or "zero".

export type LoanPurpose =
  | 'wedding'
  | 'medical'
  | 'education'
  | 'home_purchase'
  | 'home_improvement'
  | 'vehicle'
  | 'business_working_capital'
  | 'business_expansion'
  | 'debt_consolidation'
  | 'travel'
  | 'electronics_appliances'
  | 'other';

export type LoanProductType =
  | 'personal_loan'
  | 'home_loan'
  | 'loan_against_property'
  | 'gold_loan'
  | 'two_wheeler_loan'
  | 'business_loan';

export type EmploymentType = 'salaried' | 'self_employed' | 'informal';

/** A value that is either known exactly, known as a range, or unknown. */
export type KnownOrRange<T> =
  | { status: 'known'; value: T }
  | { status: 'range'; min: T; max: T }
  | { status: 'unknown' };

export type KnownOrUnknown<T> =
  | { status: 'known'; value: T }
  | { status: 'unknown' };

export interface CreditScoreInfo {
  status: 'known' | 'unknown';
  value?: number; // only meaningful when status === 'known'
}

export interface ExistingLoan {
  type: 'personal' | 'vehicle' | 'home' | 'gold' | 'business' | 'app_loan' | 'other';
  emi: number;
  remainingTenureMonths?: number;
  interestRate?: number; // annual %, if known
  isHighCost?: boolean; // e.g. app-based/informal loans priced >30% APR
}

export interface CollateralInfo {
  hasCollateral: boolean;
  type?: 'property' | 'gold' | 'fixed_deposit' | 'vehicle' | 'other';
  estimatedValue?: KnownOrUnknown<number>;
  existingEncumbrance?: 'none' | 'partial' | 'full' | 'unknown';
  ownershipClear?: KnownOrUnknown<boolean>;
}

export interface CoApplicantInfo {
  hasCoApplicant: boolean;
  monthlyIncome?: number;
}

export interface ExistingLenderOffer {
  hasOffer: boolean;
  quotedInterestRate?: number; // annual %
  processingFeePercent?: number; // % of loan amount
  quotedTenureMonths?: number;
}

/**
 * The complete borrower profile assembled from the must + adaptive
 * questions. Every field beyond the small mandatory core is optional -
 * missing data degrades confidence and widens ranges rather than
 * blocking the assessment.
 */
export interface BorrowerProfile {
  // --- Core / MUST fields -------------------------------------------------
  age: number;
  city?: string;
  state?: string;

  loanPurpose: LoanPurpose;
  isProductivePurpose: boolean; // does the loan plausibly grow/protect income?

  loanProduct: LoanProductType;
  requestedAmount: number;

  employmentType: EmploymentType;

  /** Net monthly income - exact figure when the borrower can state one. */
  netMonthlyIncome: KnownOrRange<number>;

  /** ITR / documented annual income, mainly relevant for self-employed. */
  documentedAnnualIncome?: KnownOrUnknown<number>;

  incomeStability: KnownOrUnknown<'stable' | 'somewhat_variable' | 'highly_variable'>;
  variableIncomeSharePercent?: number; // 0-100, portion of income that is variable

  employmentTenureMonths?: number; // years with employer or in business, in months

  existingEmis: ExistingLoan[]; // [] if none
  householdMonthlyExpenses: KnownOrUnknown<number>;
  dependents: number;

  creditScore: CreditScoreInfo;
  creditCardUtilizationPercent?: number; // 0-100, if applicable
  recentEmiBounces: KnownOrUnknown<number>; // count in last 6 months

  emergencySavingsMonths?: KnownOrUnknown<number>; // months of expenses covered

  collateral: CollateralInfo;
  coApplicant: CoApplicantInfo;
  existingLenderOffer: ExistingLenderOffer;

  // Business/self-employed specific
  expectedIncrementalMonthlyIncome?: number; // borrower's own estimate, if loan is productive
}

/** A partial profile as it is built up question-by-question in the UI. */
export type BorrowerProfileDraft = Partial<BorrowerProfile>;
