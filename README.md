# Borrower Copilot

**A privacy-first borrower self-assessment tool for India — helping borrowers understand whether to borrow, how much they can safely afford, what pricing is reasonable, and what EMI they should be comfortable with before negotiating with a lender.**

Borrower Copilot is a browser-based financial self-assessment product designed to close the information gap between borrowers and lenders. It answers four practical questions:

1. **Should I borrow at all?**
2. **How much can I safely afford vs. what might a lender sanction?**
3. **What interest-rate and effective APR range is reasonable for my profile?**
4. **What EMI and tenure should I be comfortable with?**

The assessment concludes with a one-screen **Negotiation Card** that gives the borrower a concise set of numbers and talking points to take into a lending conversation.

> **Important:** Borrower Copilot is an educational self-assessment tool. It is **not** a credit-scoring system, loan-approval engine, financial institution, or lender decisioning system. Its outputs are indicative estimates based on borrower-provided information and documented assumptions.

---

## Table of Contents

- [Why Borrower Copilot?](#why-borrower-copilot)
- [Product Principles](#product-principles)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Separation of Concerns](#separation-of-concerns)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Challenge Requirement Coverage](#challenge-requirement-coverage)
- [Rules Engine](#rules-engine)
- [Privacy Model](#privacy-model)
- [Assumptions & Transparency](#assumptions--transparency)
- [Benchmark Scenarios](#benchmark-scenarios)
- [Known Limitations](#known-limitations)
- [What I Would Build Next](#what-i-would-build-next)
- [What Is Intentionally Out of Scope](#what-is-intentionally-out-of-scope)
- [Engineering Quality](#engineering-quality)
- [AI-Assisted Development Disclosure](#ai-assisted-development-disclosure)
- [Project Documentation](#project-documentation)
- [Final Position](#final-position)

---

## Why Borrower Copilot?

Many borrowers enter lending conversations without a clear understanding of:

- How much debt they can realistically afford
- The difference between **lender sanction capacity** and **safe repayment capacity**
- Whether an advertised interest rate represents a reasonable price for their profile
- How processing fees affect the **effective cost of borrowing**
- How much EMI they should commit to without putting their monthly cash flow under unnecessary stress

Borrower Copilot addresses this gap *before* the borrower negotiates. The product intentionally prioritizes explainability, conservative affordability, transparency, and privacy over opaque scoring or false precision.

---

## Product Principles

### 1. Safe borrowing is different from lender eligibility

The product never treats lender capacity as the amount a borrower should automatically take. Results explicitly separate:

- **Safe borrowing range**
- **Recommended safe amount**
- **Indicative lender sanction**
- **Safe monthly EMI ceiling**

The borrower is directed toward the safe amount, not simply the maximum amount a lender might approve.

### 2. "Don't borrow" is a real outcome

The system can explicitly recommend:

- `BORROW`
- `BORROW_LESS`
- `DONT_BORROW`

The `DONT_BORROW` path is not a cosmetic UI state — it is triggered by identifiable affordability and risk conditions, and is covered by the Anita benchmark scenario.

### 3. No opaque credit score

Borrower Copilot does not create a proprietary risk score. Instead, the rules engine evaluates named factors such as:

- Existing EMI burden
- Income stability
- Recent repayment issues
- High-cost existing debt
- Credit information availability
- Loan-to-income affordability
- Product characteristics

A borrower-provided credit score may optionally influence pricing bands. There is:

- No credit-bureau pull
- No invented credit score
- No hidden ML model
- No black-box approval decision

### 4. Unknown information should not create false confidence

Missing information is handled explicitly. For example:

- Unknown credit score → wider pricing range
- Unknown income stability → moderate conservative adjustment
- Missing optional inputs → lower confidence rather than artificially improving affordability

Unknown is never silently converted into zero risk.

### 5. Every important number has a "Why?"

Calculated figures in the UI expose an expandable explanation showing the reasoning behind the number. The explanation is generated from the same rules and result data used to calculate the output, reducing the risk of business logic and UI copy drifting apart.

### 6. Ranges instead of false precision

Where uncertainty exists, the product uses ranges rather than pretending to know an exact answer:

- Fair interest rate → range
- Indicative APR → range
- Safe borrowing capacity → range
- Recommended safe amount → conservative single starting point

Deterministic inputs such as requested amount and EMI calculations remain point estimates.

### 7. Confidence is visible

The product communicates how complete the underlying borrower information is. Missing evidence reduces confidence and can widen the resulting ranges — making uncertainty part of the product rather than hiding it.

---

## Core Features

### Adaptive borrower assessment

The questionnaire starts with a compact set of core questions and adapts additional questions based on:

- Income type
- Loan purpose
- Loan product
- Existing debt
- Credit information
- Collateral
- Repayment history

Every additional question is tied to a downstream rule or output.

### Affordability assessment

The affordability engine evaluates borrower repayment capacity using a documented FOIR-style approach, considering:

- Usable monthly income
- Existing EMI obligations
- Household commitments
- Income stability
- Risk adjustments
- Product characteristics

The result produces a conservative safe EMI ceiling.

### Safe borrowing vs. lender sanction

Two different calculations are deliberately maintained:

| Calculation | Basis |
|---|---|
| **Borrower-safe amount** | The EMI the borrower can reasonably sustain |
| **Indicative lender sanction** | An estimate of what a lender might sanction, based on repayment capacity and, where applicable, collateral/LTV constraints |

These are intentionally not merged into a single number. For secured lending, sanction capacity uses the **lower of** collateral-based capacity vs. repayment-based capacity — preventing valuable collateral from being treated as a substitute for repayment ability.

### Fair pricing

The pricing engine produces:

- Indicative fair interest-rate range
- Effective APR range
- Processing-fee impact
- Profile-based pricing adjustments

The system uses borrower-provided credit information when available and widens the pricing range when important information is unknown.

### Indicative APR

APR is estimated using periodic cash-flow IRR where valid inputs are available, considering:

- Principal
- Processing fees
- Interest
- EMI schedule
- Tenure

A documented fallback is used for invalid or non-convergent inputs. APR shown by Borrower Copilot is an **indicative estimate**, not a lender-issued or regulator-certified disclosure.

### EMI and tenure trade-offs

The product shows how borrowing changes across different repayment tenures. Longer tenure can reduce monthly EMI but increase total interest cost; shorter tenure can increase monthly cash-flow pressure while reducing overall interest burden. The product presents the trade-off rather than recommending tenure based on EMI alone.

### Stress test

The assessment includes an income stress scenario to test whether the recommended repayment remains manageable under reduced income.

> The current stress case is explicitly **income reduction only**. It does not assume an interest-rate shock unless a rate-adjusted EMI calculation is actually applied — preventing the UI from claiming a stress scenario the underlying calculation doesn't perform.

### Negotiation Card

The final output is condensed into a one-screen Negotiation Card, giving the borrower practical numbers to take into a lender conversation:

- Borrowing verdict
- Requested amount
- Safe borrowing range
- Recommended safe amount
- Indicative lender sanction
- Safe EMI ceiling
- Recommended tenure
- Fair interest-rate range
- Indicative APR
- Stress-case repayment
- Key negotiation points
- Explanations for important numbers

The goal is not to tell the borrower what loan to accept. The goal is to give the borrower a defensible starting position for negotiation.

---

## Architecture

Borrower Copilot uses a deliberately simple, layered architecture:

```
┌─────────────────────────────┐
│           React UI          │
│  Questions / Results /      │
│     Negotiation Card        │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│         Rules Engine          │
│  Affordability · Eligibility  │
│  Pricing/APR · EMI · Stress   │
│  Routing · Confidence         │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│        Domain Models          │
│   Borrower / Loan / Result    │
└───────────────────────────────┘
```

The rules engine has **zero React dependency**. The core function:

```ts
calculateBorrowerAssessment(profile)
```

can be called independently from React components, unit tests, scenario tests, scripts, or a future UI. This keeps product logic deterministic, testable, and independent from presentation.

---

## Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Badge.tsx
│   │   └── TopBar.tsx
│   ├── onboarding/
│   │   ├── Landing.tsx
│   │   └── PrivacyNotice.tsx
│   ├── questions/
│   │   └── QuestionFlow.tsx
│   ├── results/
│   │   └── ResultsScreen.tsx
│   └── negotiation/
│       └── NegotiationCard.tsx
│
├── data/
│   ├── assumptions.ts
│   ├── loanProducts.ts
│   └── questions.ts
│
├── domain/
│   ├── borrower.ts
│   ├── loan.ts
│   └── results.ts
│
├── rules/
│   ├── affordability.ts
│   ├── confidence.ts
│   ├── eligibility.ts
│   ├── emi.ts
│   ├── index.ts
│   ├── pricing.ts
│   ├── routing.ts
│   └── stress.ts
│
└── utils/
    ├── buildProfile.ts
    ├── currency.ts
    ├── percentage.ts
    └── validation.ts

tests/
├── rules/
│   ├── emi.test.ts
│   └── engine.test.ts
└── scenarios/
    ├── fixtures.ts
    └── scenarios.test.ts

docs/
├── THREE_RUNTHROUGHS.md
└── WALKTHROUGH.md

RULES.md
README.md
```

---

## Separation of Concerns

| Layer | Responsibility |
|---|---|
| `domain/` | Typed borrower, loan, and result models |
| `data/` | Questions, product bands, and numerical assumptions |
| `rules/` | Deterministic financial decision logic |
| `utils/` | Formatting and validation |
| `components/` | Presentation and interaction |
| `tests/rules/` | Rule and calculation correctness |
| `tests/scenarios/` | End-to-end benchmark borrower behavior |
| `docs/` | Product walkthroughs and scenario documentation |
| `RULES.md` | Complete assumptions and decision rules |

No business decision logic is intentionally placed inside React components.

---

## Technology Stack

- **React**
- **TypeScript**
- **Vite**
- **Vitest**
- Browser-only execution
- Deterministic TypeScript rules engine
- No backend or database

The application requires no API key and no external service for the core assessment.

---

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
npm install
```

### Start development server

```bash
npm run dev
```

The application will be available at the local Vite URL, typically `http://localhost:5173`.

### Production build

```bash
npm run build
```

The production build is generated in `dist/`.

Preview the production build locally:

```bash
npm run preview
```

---

## Testing

Run the complete test suite:

```bash
npm test
```

The test suite covers:

- EMI calculation correctness
- Reverse EMI calculations
- Tenure scenarios
- Affordability boundaries
- Existing EMI stress
- Recent repayment bounce
- Unknown credit information
- Requested amount vs. safe amount
- Income stress scenarios
- Processing-fee impact on APR
- Secured vs. unsecured pricing
- Very low / zero / negative / high income edge cases
- Missing optional information
- Three benchmark borrower scenarios

---

## Challenge Requirement Coverage

| Requirement | Implementation |
|---|---|
| Borrow / Borrow Less / Don't Borrow | `src/rules/index.ts` |
| Safe borrowing amount | `src/rules/eligibility.ts` |
| Indicative lender sanction | `src/rules/eligibility.ts` |
| Fair interest-rate range | `src/rules/pricing.ts` |
| Indicative effective APR | `src/rules/pricing.ts` |
| EMI calculation | `src/rules/emi.ts` |
| Tenure trade-off | `src/rules/emi.ts` |
| Income stress test | `src/rules/stress.ts` |
| Adaptive questionnaire | `src/data/questions.ts` |
| Confidence | `src/rules/confidence.ts` |
| Product routing | `src/rules/routing.ts` |
| Negotiation Card | `src/components/negotiation/` |
| Documented assumptions | `RULES.md` |
| Benchmark borrowers | `tests/scenarios/` |

---

## Rules Engine

The rules engine is organized by financial concern:

**`affordability.ts`**
Calculates usable income, FOIR-style affordability, safe EMI ceiling, and affordability risk flags.

**`pricing.ts`**
Calculates the fair interest-rate range, indicative APR, processing-fee impact, and pricing adjustments. APR uses periodic cash-flow IRR with a documented fallback.

**`emi.ts`**
Implements the standard amortizing EMI formula, reverse EMI/principal calculations, and tenure comparisons.

**`eligibility.ts`**
Separates borrower-safe borrowing capacity from indicative lender sanction capacity. For secured products, sanction is constrained by both collateral LTV capacity **and** repayment capacity — the lower of the two is used.

**`stress.ts`**
Runs the income-only stress scenario.

**`routing.ts`**
Identifies cases where another product path may be more appropriate (e.g., a self-employed borrower with usable collateral).

**`confidence.ts`**
Derives confidence from information completeness.

**`index.ts`**
Composes the complete assessment via `calculateBorrowerAssessment(profile)` and applies the explicit `BORROW` / `BORROW_LESS` / `DONT_BORROW` decision rules.

All numerical thresholds are centralized in `src/data/assumptions.ts` and documented in `RULES.md`.

---

## Privacy Model

Privacy is a core product requirement, not an afterthought. Borrower Copilot has:

- **No login**
- **No user account**
- **No backend**
- **No database**
- **No credit-bureau integration**
- **No server-side borrower storage**
- **No `localStorage` persistence**

Borrower inputs exist only in browser-side React state. Refreshing or closing the tab clears the assessment. A **Start Over** control is also available to clear the current assessment.

---

## Assumptions & Transparency

All financial thresholds and product assumptions are documented in **[RULES.md](./RULES.md)**.

Each assumption is explicitly classified as either:

- **My judgement**
- **Market observation**

The product does not present its own numerical thresholds as regulatory requirements. Where a regulatory concept is referenced, the implementation is intentionally described as an approximation rather than implying regulatory certification.

---

## Benchmark Scenarios

The project includes three benchmark borrowers from the challenge brief. Detailed question-by-question walkthroughs are available in **[docs/THREE_RUNTHROUGHS.md](./docs/THREE_RUNTHROUGHS.md)**.

### Priya — Salaried borrower

A 29-year-old Bengaluru-based software engineer with strong income and credit information seeking an ₹8L wedding loan.

**Expected behavior:**
- `BORROW`
- Relatively narrow fair-rate range
- Comfortable safe EMI
- Clear separation between safe capacity and lender capacity

### Ravi — Self-employed borrower

A 42-year-old Mysuru kirana-store owner with a thin formal credit file and valuable unencumbered shop collateral, seeking ₹15L for inventory and a delivery vehicle.

**Expected behavior:**
- Pricing range widened due to limited credit evidence
- Unknown credit score is **not** treated as a poor score
- Secured/business lending route is surfaced
- Repayment capacity remains a constraint despite collateral

### Anita — High-stress borrower

A 35-year-old informal/gig worker with existing high-cost app loans and a recent EMI bounce, seeking ₹1.5L for an electric scooter.

**Expected behavior:**
- `DONT_BORROW`
- Existing high-cost debt surfaced
- Recent repayment issue surfaced
- Current affordability stress takes priority
- Potential future income improvement does not automatically override current repayment risk

---

## Known Limitations

**Market data** — Product interest-rate and fee bands are broad market-reference assumptions rather than live lender quotes; they should not be interpreted as the rate a particular lender will offer.

**APR** — The APR is an indicative periodic cash-flow IRR estimate, not a lender-issued or regulator-certified disclosure. Invalid inputs use the documented fallback calculation.

**User-provided information** — The system does not independently verify borrower inputs. Results are only as reliable as the information provided.

**Coverage** — The adaptive questionnaire focuses on the borrower segments described in the challenge rather than attempting to model every possible Indian lending scenario.

**Collateral** — Collateral-based sanction estimation uses the lower of LTV capacity and repayment capacity. It does not model detailed legal, title, valuation, enforcement, or lender-specific collateral requirements.

**Co-applicants** — Co-applicant income is treated conservatively. It may influence pricing in limited cases but is not automatically added to the primary borrower's safe EMI or sanction capacity.

**Wide ranges** — Safe borrowing ranges may be relatively wide for products with broad tenure windows (e.g., a 12–60 month product can produce materially different principal capacities at the same EMI depending on rate and tenure). This is intentional: the product prefers an honest range over false precision.

---

## What I Would Build Next

Potential extensions, while preserving the privacy-first design:

1. **Multi-lender quote comparison** — paste 2–3 lender offers and compare rates and APR against the fair-price range.
2. **Local document-assisted verification** — parse bank statements locally in the browser, avoiding sending financial documents to a server.
3. **Licensed lender rate-card integration** — replace broad market assumptions with current lender-specific data.
4. **Optional bureau integration** — with explicit consent, clearly separated from the default no-bureau experience.
5. **Multilingual experience** — Hindi and regional Indian languages.
6. **Scenario comparison** — compare different loan amounts, rates, and tenures side-by-side.
7. **Debt-consolidation guidance** — structured guidance when expensive existing debt is detected.
8. **Richer self-employed assessment** — seasonal cash flow, business volatility, revenue consistency, tax/income documentation patterns.

---

## What Is Intentionally Out of Scope

To keep the product focused and privacy-first, the current version does not include:

- Authentication
- User accounts
- Backend services
- Database storage
- Credit-bureau APIs
- Loan application submission
- Real lender approval
- Proprietary ML credit scoring
- Social features
- Notifications
- Payment processing
- Exhaustive lender-by-lender rate cards
- Unnecessary dashboards or visualizations

The product is intentionally a transparent borrower decision-support layer, not a lending platform.

---

## Engineering Quality

The implementation emphasizes:

- **Determinism** — same borrower profile → same assessment
- **Testability** — core business rules are independent of React
- **Explainability** — calculated outputs expose their underlying reasoning
- **Explicit uncertainty** — missing information reduces confidence instead of silently improving the result
- **Separation of concerns** — UI, domain models, assumptions, calculations, and tests are separated
- **Conservative financial reasoning** — the product prioritizes sustainable repayment capacity over maximum theoretical borrowing

---

## AI-Assisted Development Disclosure

Claude Code was used as an implementation accelerator for:

- Domain modelling
- Rules-engine implementation
- UI development
- Testing
- Documentation
- Code review iterations

Product decisions, assumptions, financial rules, benchmark behavior, and final validation were reviewed against the challenge requirements. The benchmark borrowers and engine edge cases were executed against the actual TypeScript implementation through the project's automated test suite rather than being documented only as theoretical examples.

Relevant tests:

```
tests/scenarios/scenarios.test.ts
tests/rules/engine.test.ts
tests/rules/emi.test.ts
```

Run `npm test` to verify the current implementation.

---

## Project Documentation

Additional documentation:

- **[RULES.md](./RULES.md)** — complete rules, assumptions, thresholds, and rationale
- **[docs/THREE_RUNTHROUGHS.md](./docs/THREE_RUNTHROUGHS.md)** — Priya, Ravi, and Anita walkthroughs
- **[docs/WALKTHROUGH.md](./docs/WALKTHROUGH.md)** — product walkthrough and assessment flow

---

## Final Position

Borrower Copilot is deliberately **not** trying to answer:

> "How much money will a lender give me?"

It is trying to answer the more useful borrower question:

> "What amount can I reasonably afford, what pricing should I negotiate for, and what should I be comfortable agreeing to?"

That distinction is the core product decision behind the system.

**Status:** Challenge implementation complete.
