# RULES.md

Every numeric assumption in Borrower Copilot's rules engine is listed here.
Nothing in this document is invented after the fact - these tables mirror
`src/data/assumptions.ts` and `src/data/loanProducts.ts` exactly. If you
change a number in code, change it here too.

## How to read the "Source" column

- **My judgement** - a reasonable, conservative choice I made because no
  single authoritative number exists for this (or the exact number varies
  lender-to-lender). Not a citation.
- **Market observation** - based on publicly advertised rate/fee ranges
  from large Indian banks and NBFCs, as a broad band, not a specific
  lender's quote.
- **RBI / regulatory** - drawn from an actual regulatory source. (Used
  sparingly - most of this product is judgement, not regulation, and it
  says so.)

---

## 1. FOIR (Fixed Obligation to Income Ratio) ceilings

The maximum share of *usable* monthly income that total debt obligations
(existing EMI + new EMI) are allowed to consume.

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Salaried, stable income | 50% | Common informal ceiling used by many unsecured lenders for salaried applicants with steady income | My judgement |
| Salaried, variable income | 45% | Slightly tighter because bonus/incentive income is less certain month to month | My judgement |
| Self-employed | 40% | Business cash flow is inherently less predictable than a salary | My judgement |
| Informal income | 35% | Highest income uncertainty and typically no formal income smoothing (e.g. no paid leave) | My judgement |
| Floor (minimum FOIR after all penalties) | 15% | Even a heavily penalised borrower should see a >0 ceiling rather than a hard-coded zero baked into the formula | My judgement |

### Penalties applied on top of the base ceiling (subtracted, in percentage points)

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Existing high-cost debt (≥30% effective interest) | -5pp | High-cost debt signals existing repayment strain | My judgement |
| Recent EMI bounce (last 6 months) | -7pp | The strongest single signal of current repayment stress | My judgement |
| Low emergency buffer (<1 month expenses saved, when known) | -3pp | Less room to absorb a shock without missing the new EMI | My judgement |

## 2. Income haircuts (applied before FOIR)

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Stable income | 0% | No discount needed | My judgement |
| Somewhat variable income | 15% | Partial discount for irregular components | My judgement |
| Highly variable income | 30% | Larger discount for income that swings materially month to month | My judgement |
| Unknown stability | Treated as "somewhat variable" (15%) | Unknown must never default to the *best* case; treating it as fully stable would overstate capacity | My judgement |
| Income given as a range (not exact) | +10% additional haircut | Extra caution for uncertainty in the number itself, on top of any stability haircut | My judgement |
| Cash/undocumented income, lender-sanction view only | +35% haircut (sanction estimate only, not the safe-amount calc) | Lenders discount unverifiable cash income heavily; the borrower's own safe-amount calculation does not apply this because the borrower knows their real cash flow | My judgement |

## 3. Safety buffer & emergency savings

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Safety buffer reserved from net income (expense-based capacity calc) | 10% | Leaves room for irregular/unplanned costs beyond fixed EMIs and expenses | My judgement |
| "Low emergency buffer" threshold | <1 month of expenses saved | Common rule-of-thumb floor for financial resilience | My judgement |

## 4. Safe EMI ceiling methodology

The safe EMI ceiling is the **lower of**:
1. `usableMonthlyIncome × FOIR ceiling − existing EMI` (FOIR-based capacity), and
2. `netIncome − household expenses − existing EMI − 10% safety buffer` (expense-based capacity, only when expenses are known - otherwise this method is skipped and FOIR-based capacity is used alone).

Taking the minimum of the two is a deliberate conservatism: a borrower
might pass a FOIR check but still have no real cash left after rent and
groceries, or vice versa.

## 5. Credit score pricing bands

Adjustment applied to the product's base interest-rate band (percentage
points; negative = cheaper).

| Score band | Adjustment | Source |
| --- | --- | --- |
| 780–900 | -1.25pp | My judgement, informed by typical "excellent" tier pricing gaps advertised by lenders |
| 730–779 | -0.5pp | My judgement |
| 680–729 | 0pp (baseline) | My judgement |
| 600–679 | +1.5pp | My judgement |
| 300–599 | +3.5pp | My judgement |
| **Unknown** | Widen range: -0.25pp on the low end, +2.0pp on the high end | Unknown score must never be assumed to be a poor score - it widens the range instead of shifting it up | Product principle (explicit brief requirement) |

## 6. Other pricing adjustments (percentage points)

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Highly variable income | up to +0.75pp (upper bound) | Higher perceived repayment risk | My judgement |
| Stable income | -0.25pp (lower bound) | Rewards predictability | My judgement |
| Unknown income stability | +0.375pp (upper bound only) | Small caution premium, smaller than a confirmed "highly variable" | My judgement |
| Existing high-cost debt | +1.0pp | Signals existing financial stress | My judgement |
| Recent EMI bounce | +1.5pp | Strongest negative signal | My judgement |
| Documented (ITR) income available (self-employed) | -0.5pp | Verifiable income reduces lender risk | My judgement |
| Collateral offered even on an unsecured product | -0.5pp | Lenders often price better with informal security, even outside a formal secured product | My judgement |
| Co-applicant with income | -0.25pp | Modest pricing signal only; income is not added to affordability without verified joint-liability evidence | My judgement |

## 7. Processing fee & APR methodology

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Assumed "other fees" (documentation/insurance-type) | 0.4% of loan amount | Small placeholder for costs beyond the headline processing fee | My judgement |
| APR formula | Annualised periodic IRR of `[-(principal - upfront fees), monthly EMI × tenure]` | Captures the timing of the upfront fee and each scheduled repayment instead of treating fees as interest | My judgement - **explicitly not** a regulator-certified APR |

**Important honesty note:** this is an indicative periodic cash-flow IRR,
not a regulator-certified APR/XIRR disclosure. The cash-flow schedule uses
the requested principal, subtracts processing and assumed other fees from
the initial disbursement, then uses the amortising monthly EMI for the
quoted tenure (or recommended tenure when no quote exists). If the amount
is invalid or the IRR cannot be bracketed, the engine falls back to nominal
rate plus the fee load spread over the tenure and says so in the
methodology note. The exact lender disclosure may differ.

## 8. Lender-like sanction estimation (kept separate from safe amount)

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Unsecured income multiple - salaried | 22× net monthly income | Broadly in line with advertised personal-loan sanction ranges for salaried applicants with clean credit | Market observation |
| Unsecured income multiple - self-employed | 14× net/documented monthly income | Lower multiple reflecting harder-to-verify income | Market observation |
| Unsecured income multiple - informal | 8× net monthly income | Conservative multiple for undocumented income | My judgement |
| Lender FOIR assumption (used only for the sanction estimate, not the borrower's safe amount) | 55% | Lenders often use a looser affordability check than we recommend for the borrower's own safe amount | My judgement |
| Secured products: max LTV | Set per product (see loan products table below) | Standard practice: secured lending caps loan size as a % of collateral value | Market observation |

For secured products with usable collateral, the indicative sanction is
`min(collateral value × max LTV, principal supported by lender-FOIR EMI
capacity)`. LTV is a ceiling, not a guaranteed minimum; there is no
arbitrary collateral-based floor. If collateral data is unusable, the
income-based path is used instead.

Co-applicant income is intentionally conservative: a co-applicant with
income can modestly improve pricing, but it is not added to the
borrower's safe affordability or lender-like sanction calculation because
joint liability and verifiable income are not established by this
self-assessment.

## 9. Collateral / LTV assumptions

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Partial encumbrance haircut | 50% of estimated value removed | An existing loan against the asset reduces the free equity a new lender can rely on | My judgement |
| Full encumbrance haircut | 100% removed (no incremental value) | Fully pledged assets add nothing to a new sanction | My judgement |
| Unclear/unknown ownership haircut | 25% removed | Reflects the risk/uncertainty of unclear title | My judgement |

## 10. Product-specific bands

| Product | Secured | Indicative rate band (annual) | Tenure range | Processing fee range | Max LTV |
| --- | --- | --- | --- | --- | --- |
| Personal loan | No | 10.5% – 22% | 12 – 60 months | 1% – 3% | - |
| Home loan | Yes | 8.0% – 10.5% | 60 – 360 months | 0.25% – 1% | 80% |
| Loan against property | Yes | 9.0% – 13.5% | 36 – 180 months | 0.5% – 1.5% | 60% |
| Gold loan | Yes | 9.0% – 16% | 3 – 36 months | 0% – 1% | 75% |
| Two-wheeler loan | Yes | 9.5% – 18% | 12 – 48 months | 1% – 3% | 85% |
| Business loan | No | 11% – 24% | 12 – 60 months | 1% – 2.5% | - |

Source: **Market observation** - broad, indicative bands assembled from
publicly advertised ranges across large Indian banks/NBFCs as of early
2026. These are **not** quotes from any specific lender and **not**
sourced from RBI. Actual pricing for any individual lender will differ.

## 11. Tenure caps

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Maximum age at loan maturity | 60 years | Common practical ceiling many lenders apply, especially for longer-tenure secured products | My judgement |

## 12. Stress test assumptions

| What | Value | Why | Source |
| --- | --- | --- | --- |
| Income drop | 15% | A plausible, moderate income shock to test resilience against (job loss/business slowdown) - not a worst-case catastrophe, not a trivial dip | My judgement |
| Rate increase | 0 (not applied) | The current stress output is intentionally income-only; it must not claim a rate shock without recalculating an EMI under that shock | Product principle |

## 13. Verdict thresholds

| What | Value | Why | Source |
| --- | --- | --- | --- |
| "Borrow less" trigger | Required EMI > safe EMI ceiling | Direct, explainable comparison rather than a composite score | My judgement |
| "Don't borrow" - severe stress override | (High-cost existing debt **and** recent bounce) **or** existing EMI alone already consumes ≥90% of usable income | These are direct evidence of active repayment distress independent of the new loan | My judgement |
| "Already over-extended" FOIR threshold | 90% | Existing EMI alone using up nearly all safe capacity is itself a red flag | My judgement |

The verdict is computed by **explicit if/else rules**, not a weighted
score - see `src/rules/index.ts::buildVerdict`. Severe-stress is checked
first and can independently force `DONT_BORROW` regardless of the
requested amount.

## 14. Confidence rules

Confidence is derived from counting "evidence gaps" - specific pieces of
information that are missing or estimated rather than exact - per output:

| Confidence | Evidence gaps |
| --- | --- |
| HIGH | 0 gaps |
| MEDIUM | 1–2 gaps |
| LOW | 3+ gaps |

Gaps counted include (varies by output - see `src/rules/confidence.ts`):
income given as a range instead of exact, unknown income stability,
unknown/undocumented income for self-employed borrowers, unknown
household expenses, unknown credit score, unknown recent-bounce history,
unknown emergency savings, and unknown collateral value when collateral
was offered. Overall confidence is the **weakest** of all per-output
confidences ("a chain is as strong as its weakest link").

## 15. High-cost debt & recent-bounce treatment

| What | Value | Why | Source |
| --- | --- | --- | --- |
| "High-cost" existing debt definition | Flagged as high-cost by the user, or a stated interest rate ≥30% | Common threshold separating mainstream credit from app-based/informal high-cost credit | My judgement |
| Recent bounce | Any bounce/missed EMI reported in the last 6 months | Directly stated by the borrower - never inferred | Product principle |

## 16. Productive-purpose treatment

A "productive" purpose (business use, income-generating asset) is
acknowledged in the verdict reasoning and in routing, but it **never**
overrides an active severe-stress flag (recent bounce + high-cost debt,
or an already-over-extended FOIR). Expected incremental income the
borrower provides is shown but is never added into the affordability
calculation as guaranteed income - see `src/rules/index.ts`.

---

## What this product deliberately does NOT do

- It does not pull or invent a CIBIL/credit bureau score. A borrower-provided
  score, when known, is only one input to the indicative rate band.
- It does not claim any number here is an approval, a guarantee, or a
  regulatory-certified figure (e.g. the APR is explicitly an indicative
  periodic cash-flow estimate, not a regulator's APR/XIRR disclosure).
- It does not invent RBI rules. Regulatory language is avoided unless a
  rule is genuinely regulatory (none of the numeric thresholds above are).
