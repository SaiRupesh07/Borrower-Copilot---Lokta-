// Every constant here is documented in RULES.md with What / Value / Why /
// Source. Keep this file and RULES.md in sync - if you change a number
// here, update the table there too. Nothing in this file is an RBI rule
// unless explicitly commented as such; the overwhelming majority are
// "my judgement" - conservative, defensible, and intentionally simple.

export const ASSUMPTIONS = {
  // ---- FOIR (Fixed Obligation to Income Ratio) ceilings -------------------
  // Applied to "usable monthly income" (see income haircuts below) to cap
  // TOTAL monthly debt obligations (existing EMI + new EMI).
  foirCeiling: {
    salariedStable: 0.5,
    salariedVariable: 0.45,
    selfEmployed: 0.4,
    informal: 0.35,
  },
  // Additional FOIR tightening (percentage points subtracted) when a risk
  // flag is present. Applied cumulatively but floored at foirFloor.
  foirPenalty: {
    highCostExistingDebt: 0.05,
    recentBounce: 0.07,
    lowEmergencyBuffer: 0.03, // < 1 month of expenses saved, when known
  },
  foirFloor: 0.15, // FOIR ceiling never goes below this, however many penalties apply

  // ---- Income haircuts (uncertainty discount before FOIR is applied) ------
  incomeHaircut: {
    stable: 0,
    somewhat_variable: 0.15,
    highly_variable: 0.3,
    // Applied when income is only known as a range: use the midpoint,
    // then apply an extra range-uncertainty haircut on top of stability.
    rangeUncertainty: 0.1,
    // Cash/informal income that is not documented anywhere (no ITR, no
    // bank statement) gets an additional conservative haircut for the
    // *lender sanction* estimate only (not for the borrower's own safe
    // amount, since the borrower knows their real cash flow).
    undocumentedForLenderView: 0.35,
  },

  // ---- Safety buffer --------------------------------------------------
  // Reserved slice of net income that is never counted as repayment
  // capacity, on top of FOIR, to leave room for irregular costs.
  safetyBufferPercentOfIncome: 0.1,

  // ---- Emergency savings ------------------------------------------------
  lowEmergencyBufferThresholdMonths: 1, // fewer than this = "low buffer" flag

  // ---- Credit score bands (used only when score is known) ---------------
  // Adjustment in percentage points applied to the product's base rate
  // band (both min and max shift down for good scores, up for poor ones).
  creditScoreAdjustment: [
    { min: 780, max: 900, adjust: -1.25 },
    { min: 730, max: 779, adjust: -0.5 },
    { min: 680, max: 729, adjust: 0 },
    { min: 600, max: 679, adjust: 1.5 },
    { min: 300, max: 599, adjust: 3.5 },
  ],
  // When credit score is unknown: widen the rate band instead of guessing.
  unknownCreditScoreWidenPercent: { lower: -0.25, upper: 2.0 },

  // ---- Other rate adjustments (percentage points) ------------------------
  rateAdjustment: {
    incomeHighlyVariable: 0.75,
    incomeStable: -0.25,
    existingHighCostDebt: 1.0,
    recentBounce: 1.5,
    documentedIncomeAvailable: -0.5, // ITR/payslip on file
    hasCollateralForUnsecuredAsk: -0.5, // strong collateral even if product itself is unsecured-typical
    coApplicantWithIncome: -0.25,
  },

  // ---- Processing fee / APR ----------------------------------------------
  assumedOtherFeesPercent: 0.4, // documentation/stamp/insurance nudge, my judgement

  // ---- Lender-like sanction (separate from safe amount) ------------------
  // Indicative multiple of usable monthly income lenders extend for
  // unsecured personal/business loans, before FOIR-based capping.
  unsecuredSanctionIncomeMultiple: {
    salaried: 22,
    self_employed: 14,
    informal: 8,
  },
  // FOIR ceiling lenders themselves are assumed to use when sizing an
  // unsecured sanction (typically looser than our own safe-borrowing FOIR).
  lenderFoirAssumption: 0.55,

  // ---- Collateral / LTV ---------------------------------------------------
  // (Product-specific max LTV lives in loanProducts.ts.) Encumbrance and
  // ownership uncertainty haircut applied to collateral value before LTV.
  collateralHaircut: {
    partialEncumbrance: 0.5,
    fullEncumbrance: 1.0, // fully encumbered = no incremental collateral value
    ownershipUnknown: 0.25,
  },

  // ---- Stress test ---------------------------------------------------
  stress: {
    incomeDropPercent: 0.15, // my judgement: a plausible income shock to test against
    // The current stress calculation is income-only. Keep this at zero
    // until a rate-adjusted EMI calculation is implemented.
    ratePlusPercent: 0,
  },

  // ---- Verdict thresholds -------------------------------------------------
  verdict: {
    // Requested EMI vs safe ceiling ratio above which we say "borrow less"
    borrowLessThreshold: 1.0,
    // Total FOIR utilisation (existing EMI alone / usable income) above
    // which the borrower is already over-extended, independent of the
    // new loan.
    alreadyOverExtendedForir: 0.9,
  },

  // ---- Confidence -----------------------------------------------------
  // Each of these, if true/missing, counts as one "evidence gap".
  confidenceThresholds: {
    highMaxGaps: 0,
    mediumMaxGaps: 2,
    // 3+ gaps => LOW
  },

  // ---- Tenure ----------------------------------------------------------
  maxAgeAtLoanMaturity: 60, // years - caps usable tenure for secured/long-tenure products
} as const;
