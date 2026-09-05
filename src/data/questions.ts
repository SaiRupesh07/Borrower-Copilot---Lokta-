import type { BorrowerProfileDraft, EmploymentType, LoanProductType, LoanPurpose } from '../domain/borrower';

export type QuestionField =
  | 'loanPurpose'
  | 'loanProduct'
  | 'requestedAmount'
  | 'age'
  | 'employmentType'
  | 'netMonthlyIncome'
  | 'incomeStability'
  | 'existingEmis'
  | 'householdMonthlyExpenses'
  | 'creditScore'
  | 'employmentTenureMonths'
  | 'variableIncomeSharePercent'
  | 'emergencySavingsMonths'
  | 'creditCardUtilizationPercent'
  | 'documentedAnnualIncome'
  | 'dependents'
  | 'recentEmiBounces'
  | 'collateral'
  | 'coApplicant'
  | 'existingLenderOffer'
  | 'expectedIncrementalMonthlyIncome'
  | 'isProductivePurpose';

export interface QuestionDef {
  id: string;
  field: QuestionField;
  prompt: string;
  helpText?: string;
  /** Which outputs this question's answer can change. Every adaptive question must declare at least one. */
  affects: Array<'safeAmount' | 'lenderSanction' | 'fairRate' | 'apr' | 'emiCeiling' | 'verdict' | 'confidence' | 'stress' | 'routing'>;
  required: boolean;
  allowUnknown?: boolean;
  /** Only shown when this returns true for the profile built so far. Absent = always shown (must question). */
  showIf?: (draft: BorrowerProfileDraft) => boolean;
}

export const LOAN_PURPOSES: { value: LoanPurpose; label: string; productive: boolean }[] = [
  { value: 'wedding', label: 'Wedding', productive: false },
  { value: 'medical', label: 'Medical expense', productive: false },
  { value: 'education', label: 'Education', productive: true },
  { value: 'home_purchase', label: 'Buying a home', productive: false },
  { value: 'home_improvement', label: 'Home improvement/repair', productive: false },
  { value: 'vehicle', label: 'Vehicle purchase', productive: false },
  { value: 'business_working_capital', label: 'Business working capital', productive: true },
  { value: 'business_expansion', label: 'Business expansion/equipment', productive: true },
  { value: 'debt_consolidation', label: 'Consolidating existing debt', productive: false },
  { value: 'travel', label: 'Travel', productive: false },
  { value: 'electronics_appliances', label: 'Electronics/appliances', productive: false },
  { value: 'other', label: 'Something else', productive: false },
];

export const LOAN_PRODUCT_OPTIONS: { value: LoanProductType; label: string }[] = [
  { value: 'personal_loan', label: 'Personal loan' },
  { value: 'home_loan', label: 'Home loan' },
  { value: 'loan_against_property', label: 'Loan against property' },
  { value: 'gold_loan', label: 'Gold loan' },
  { value: 'two_wheeler_loan', label: 'Two-wheeler loan' },
  { value: 'business_loan', label: 'Business loan' },
];

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string; help: string }[] = [
  { value: 'salaried', label: 'Salaried', help: 'You receive a fixed monthly salary from an employer.' },
  { value: 'self_employed', label: 'Self-employed / business owner', help: 'You run a business, shop, or practice.' },
  { value: 'informal', label: 'Informal / gig income', help: 'Daily wage, gig platforms, tailoring, or similar irregular income.' },
];

// ---- MUST questions (always asked) -----------------------------------
export const MUST_QUESTIONS: QuestionDef[] = [
  {
    id: 'purpose',
    field: 'loanPurpose',
    prompt: 'What are you borrowing for?',
    affects: ['verdict', 'routing', 'fairRate'],
    required: true,
  },
  {
    id: 'product',
    field: 'loanProduct',
    prompt: 'What type of loan are you considering?',
    affects: ['fairRate', 'emiCeiling', 'safeAmount', 'lenderSanction', 'apr'],
    required: true,
  },
  {
    id: 'amount',
    field: 'requestedAmount',
    prompt: 'How much do you want to borrow?',
    helpText: 'Enter the amount in rupees.',
    affects: ['verdict', 'emiCeiling'],
    required: true,
  },
  {
    id: 'age',
    field: 'age',
    prompt: 'What is your age?',
    affects: ['emiCeiling', 'safeAmount'],
    helpText: 'Used only to cap realistic loan tenure - never stored beyond this session.',
    required: true,
  },
  {
    id: 'employmentType',
    field: 'employmentType',
    prompt: 'How do you earn?',
    affects: ['fairRate', 'safeAmount', 'lenderSanction', 'confidence', 'routing'],
    required: true,
  },
  {
    id: 'income',
    field: 'netMonthlyIncome',
    prompt: 'What is your monthly net income (take-home, after tax)?',
    helpText: "If it varies, you can give a range instead of an exact number.",
    affects: ['safeAmount', 'lenderSanction', 'emiCeiling', 'fairRate', 'confidence'],
    required: true,
    allowUnknown: false,
  },
  {
    id: 'existingEmis',
    field: 'existingEmis',
    prompt: 'What are your existing monthly EMIs or loan repayments, if any?',
    helpText: 'Include personal, vehicle, home, gold, business, or app-based loans. Leave empty if none.',
    affects: ['safeAmount', 'emiCeiling', 'verdict', 'fairRate'],
    required: true,
  },
  {
    id: 'expenses',
    field: 'householdMonthlyExpenses',
    prompt: 'What are your essential monthly household expenses (rent, food, utilities, school fees etc.)?',
    affects: ['safeAmount', 'emiCeiling', 'confidence'],
    required: true,
    allowUnknown: true,
  },
  {
    id: 'creditScore',
    field: 'creditScore',
    prompt: 'What is your credit score, if you know it?',
    helpText: "It's fine if you don't know - we'll widen our estimates instead of guessing.",
    affects: ['fairRate', 'lenderSanction', 'confidence'],
    required: true,
    allowUnknown: true,
  },
];

// ---- Adaptive questions -------------------------------------------------
export const ADAPTIVE_QUESTIONS: QuestionDef[] = [
  {
    id: 'incomeStability',
    field: 'incomeStability',
    prompt: 'How stable is your income month to month?',
    affects: ['safeAmount', 'fairRate', 'emiCeiling', 'confidence'],
    required: false,
    allowUnknown: true,
    showIf: () => true,
  },
  {
    id: 'employerTenure',
    field: 'employmentTenureMonths',
    prompt: 'How long have you been with your current employer?',
    affects: ['confidence', 'fairRate'],
    required: false,
    showIf: (d) => d.employmentType === 'salaried',
  },
  {
    id: 'businessTenure',
    field: 'employmentTenureMonths',
    prompt: 'How many years have you been running this business?',
    affects: ['confidence', 'fairRate', 'lenderSanction'],
    required: false,
    showIf: (d) => d.employmentType === 'self_employed',
  },
  {
    id: 'variableIncomeShare',
    field: 'variableIncomeSharePercent',
    prompt: 'Roughly what share of your income is variable (bonus, incentives, overtime)?',
    affects: ['fairRate', 'safeAmount'],
    required: false,
    showIf: (d) => d.employmentType === 'salaried',
  },
  {
    id: 'itrIncome',
    field: 'documentedAnnualIncome',
    prompt: 'What is your documented (ITR) annual income, if filed?',
    helpText: "This is often lower than your real cash income - that's normal and we account for it.",
    affects: ['fairRate', 'lenderSanction', 'confidence'],
    required: false,
    allowUnknown: true,
    showIf: (d) => d.employmentType === 'self_employed',
  },
  {
    id: 'emergencySavings',
    field: 'emergencySavingsMonths',
    prompt: 'How many months of expenses do you have in savings, if any?',
    affects: ['verdict', 'confidence'],
    required: false,
    allowUnknown: true,
    showIf: () => true,
  },
  {
    id: 'ccUtilisation',
    field: 'creditCardUtilizationPercent',
    prompt: 'What is your typical credit card utilisation (% of limit used)?',
    affects: ['fairRate'],
    required: false,
    showIf: (d) => d.employmentType === 'salaried',
  },
  {
    id: 'dependents',
    field: 'dependents',
    prompt: 'How many people depend on your income?',
    affects: ['safeAmount', 'verdict'],
    required: false,
    showIf: (d) => d.employmentType === 'informal' || d.employmentType === 'self_employed',
  },
  {
    id: 'recentBounce',
    field: 'recentEmiBounces',
    prompt: 'Have you had any EMI or loan repayment bounce/fail in the last 6 months?',
    affects: ['verdict', 'fairRate', 'confidence'],
    required: false,
    allowUnknown: true,
    showIf: (d) => (d.existingEmis?.length ?? 0) > 0 || d.employmentType === 'informal',
  },
  {
    id: 'productivePurpose',
    field: 'isProductivePurpose',
    prompt: 'Do you expect this loan to directly increase or protect your income (e.g. a work vehicle, stock, equipment)?',
    affects: ['verdict', 'routing'],
    required: false,
    showIf: (d) =>
      d.loanPurpose === 'business_working_capital' ||
      d.loanPurpose === 'business_expansion' ||
      d.loanPurpose === 'vehicle' ||
      d.employmentType === 'informal' ||
      d.employmentType === 'self_employed',
  },
  {
    id: 'incrementalIncome',
    field: 'expectedIncrementalMonthlyIncome',
    prompt: 'Roughly how much extra monthly income do you expect this loan to generate?',
    helpText: "We'll note this but won't treat it as guaranteed income.",
    affects: ['verdict'],
    required: false,
    showIf: (d) => d.isProductivePurpose === true,
  },
  {
    id: 'collateral',
    field: 'collateral',
    prompt: 'Do you have any property, gold, or other asset you could offer as collateral?',
    affects: ['safeAmount', 'lenderSanction', 'fairRate', 'routing'],
    required: false,
    showIf: (d) =>
      d.loanProduct === 'home_loan' ||
      d.loanProduct === 'loan_against_property' ||
      d.loanProduct === 'gold_loan' ||
      d.employmentType === 'self_employed',
  },
  {
    id: 'coApplicant',
    field: 'coApplicant',
    prompt: 'Do you have a co-applicant, and if so what is their monthly income?',
    affects: ['fairRate', 'lenderSanction'],
    required: false,
    showIf: () => true,
  },
  {
    id: 'lenderOffer',
    field: 'existingLenderOffer',
    prompt: 'Has a lender already quoted you a rate or processing fee?',
    affects: ['apr'],
    required: false,
    showIf: () => true,
  },
];

export function visibleQuestions(draft: BorrowerProfileDraft): QuestionDef[] {
  return [...MUST_QUESTIONS, ...ADAPTIVE_QUESTIONS.filter((q) => !q.showIf || q.showIf(draft))];
}
