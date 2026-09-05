# Borrower Copilot

**A privacy-first borrower self-assessment tool for India** — helping borrowers understand whether to borrow, how much they can safely afford, what pricing is reasonable, and what EMI they should be comfortable with before negotiating with a lender.

It answers four questions: **Should I borrow at all? How much can I safely afford vs. what might a lender sanction? What interest rate/APR is reasonable for my profile? What EMI and tenure should I be comfortable with?** The assessment ends with a one-screen **Negotiation Card** summarizing numbers and talking points for a lending conversation.

> **Important:** This is an educational self-assessment tool — **not** a credit-scoring system, loan-approval engine, or lender decisioning system. Outputs are indicative estimates based on borrower-provided information and documented assumptions.

---

## Why It Exists

Borrowers often don't know how much debt they can realistically afford, how lender sanction capacity differs from safe repayment capacity, whether an offered rate is fair, or how fees affect the true cost of borrowing. Borrower Copilot closes that gap *before* the negotiation — prioritizing explainability, conservative affordability, transparency, and privacy over opaque scoring or false precision.

---

## Product Principles

1. **Safe borrowing ≠ lender eligibility** — results separate the *safe borrowing range* and *recommended safe amount* from the *indicative lender sanction*. The borrower is steered toward the safe amount, not the maximum a lender might approve.
2. **"Don't borrow" is a real outcome** — the engine can output `BORROW`, `BORROW_LESS`, or `DONT_BORROW`, driven by identifiable risk conditions (see the Anita scenario below).
3. **No opaque credit score** — no bureau pull, no invented score, no black-box ML. The engine evaluates named factors (EMI burden, income stability, repayment history, existing debt, etc.); a borrower-provided credit score can optionally influence pricing.
4. **Unknowns widen ranges, not confidence** — missing credit or income-stability data leads to wider ranges or conservative adjustments, never to artificially improved affordability.
5. **Every number has a "Why?"** — expandable explanations are generated from the same rules/result data driving the calculation.
6. **Ranges over false precision** — fair rate, APR, and safe capacity are shown as ranges; only deterministic inputs (requested amount, EMI) are point estimates.
7. **Confidence is visible** — the product surfaces how complete the borrower's information is, and lets that completeness widen or narrow the ranges shown.

---

## Core Features

- **Adaptive questionnaire** — starts compact, adds questions based on income type, loan purpose/product, existing debt, credit info, collateral, and repayment history. Every extra question maps to a downstream rule.
- **Affordability engine** — FOIR-style assessment of usable income, existing EMI, household commitments, income stability, and risk adjustments → a conservative safe EMI ceiling.
- **Safe amount vs. lender sanction** — two numbers, never merged. For secured loans, sanction = **lower of** collateral (LTV) capacity and repayment capacity, so collateral can't substitute for repayment ability.
- **Fair pricing** — fair interest-rate range, effective APR range, and processing-fee impact, widened when credit information is missing.
- **Indicative APR** — periodic cash-flow IRR where inputs are valid, with a documented fallback otherwise. Not a lender-issued or regulator-certified figure.
- **EMI/tenure trade-offs** — shows how longer tenure lowers EMI but raises total interest, and vice versa, rather than picking a tenure for the user.
- **Stress test** — income-reduction-only scenario; does not silently assume a rate shock the calculation doesn't actually apply.
- **Negotiation Card** — one screen with verdict, requested amount, safe range, recommended amount, lender sanction, EMI ceiling, tenure, rate/APR ranges, stress-case repayment, negotiation points, and explanations.

---

## Architecture

```
React UI  →  Rules Engine  →  Domain Models
(Questions/     (Affordability,     (Borrower /
 Results/        Eligibility,        Loan /
 Negotiation)     Pricing, EMI,       Result)
                  Stress, Routing,
                  Confidence)
```

The rules engine has **zero React dependency** — `calculateBorrowerAssessment(profile)` can be called from components, tests, scripts, or a future UI, keeping product logic deterministic and testable independent of presentation.

---

## Project Structure

```
src/
├── components/   → onboarding, questions, results, negotiation UI
├── data/         → assumptions.ts, loanProducts.ts, questions.ts
├── domain/       → borrower.ts, loan.ts, results.ts
├── rules/        → affordability, eligibility, pricing, emi, stress, routing, confidence, index
└── utils/        → buildProfile, currency, percentage, validation

tests/
├── rules/        → emi.test.ts, engine.test.ts
└── scenarios/    → fixtures.ts, scenarios.test.ts

docs/  → THREE_RUNTHROUGHS.md, WALKTHROUGH.md
RULES.md, README.md
```

No business logic lives inside React components — it's all in `rules/`, backed by typed `domain/` models and centralized `data/assumptions.ts`.

---

## Technology Stack

React · TypeScript · Vite · Vitest — browser-only, no backend, no database, no API key required.

## Getting Started

```bash
npm install       # install deps
npm run dev        # dev server, typically http://localhost:5173
npm run build       # production build → dist/
npm run preview      # preview the build
npm test            # run the full test suite
```

Tests cover EMI/reverse-EMI math, tenure scenarios, affordability boundaries, existing-EMI stress, repayment bounce, unknown credit info, income stress, processing-fee/APR impact, secured vs. unsecured pricing, income edge cases, and the three benchmark scenarios.

---

## Challenge Requirement Coverage

| Requirement | Implementation |
|---|---|
| Borrow / Borrow Less / Don't Borrow | `src/rules/index.ts` |
| Safe amount & lender sanction | `src/rules/eligibility.ts` |
| Fair rate & indicative APR | `src/rules/pricing.ts` |
| EMI & tenure trade-off | `src/rules/emi.ts` |
| Income stress test | `src/rules/stress.ts` |
| Adaptive questionnaire | `src/data/questions.ts` |
| Confidence | `src/rules/confidence.ts` |
| Product routing | `src/rules/routing.ts` |
| Negotiation Card | `src/components/negotiation/` |
| Assumptions & benchmarks | `RULES.md`, `tests/scenarios/` |

---

## Privacy Model

**No login, no accounts, no backend, no database, no bureau integration, no server-side storage, no `localStorage`.** Borrower inputs live only in browser React state — closing or refreshing the tab clears everything, and a **Start Over** control does the same on demand.

---

## Assumptions & Transparency

All thresholds are documented in **[RULES.md](./RULES.md)**, each tagged as either **my judgement** or **market observation**. Nothing is presented as a regulatory requirement; regulatory concepts referenced are explicitly framed as approximations, not certifications.

---

## Benchmark Scenarios

Full walkthroughs in **[docs/THREE_RUNTHROUGHS.md](./docs/THREE_RUNTHROUGHS.md)**.

- **Priya** — salaried Bengaluru engineer, ₹8L wedding loan → `BORROW`, narrow rate range, comfortable EMI, clear safe/lender-capacity split.
- **Ravi** — self-employed Mysuru shop owner, thin credit file, ₹15L for inventory/vehicle → widened pricing (unknown score ≠ poor score), secured/business route surfaced, repayment still constrains despite collateral.
- **Anita** — informal/gig worker, existing high-cost debt, recent EMI bounce, ₹1.5L for a scooter → `DONT_BORROW`, current repayment risk takes priority over potential future income.

---

## Known Limitations

- **Market data** is broad reference bands, not live lender quotes.
- **APR** is an indicative IRR estimate, not a certified disclosure; invalid inputs use a documented fallback.
- Borrower inputs are **not independently verified**.
- The questionnaire covers the challenge's borrower segments, not every Indian lending scenario.
- **Collateral** sanction uses the lower of LTV vs. repayment capacity; it doesn't model legal/title/valuation specifics.
- **Co-applicant** income is treated conservatively and isn't automatically added to the primary borrower's capacity.
- **Ranges can be wide** for products with broad tenure windows — intentional, to avoid false precision.

---

## What's Out of Scope

Authentication, user accounts, backend/database, bureau APIs, loan submission, real lender approval, proprietary ML scoring, social features, notifications, payments, exhaustive rate cards, and unnecessary dashboards. This is a **decision-support layer**, not a lending platform.

## What I'd Build Next

Multi-lender quote comparison · local, in-browser bank-statement parsing · licensed lender rate-card integration · optional (consent-based) bureau integration · multilingual support (Hindi + regional languages) · side-by-side scenario comparison · debt-consolidation guidance · a richer self-employed assessment (seasonal cash flow, revenue consistency).

---

## Engineering Quality

Deterministic (same profile → same output), testable (rules independent of React), explainable (outputs expose their reasoning), honest about uncertainty (missing data widens ranges rather than hiding gaps), and cleanly separated across UI/domain/rules/tests.

## AI-Assisted Development Disclosure

Claude Code was used to accelerate domain modelling, the rules engine, UI, testing, and documentation. Product decisions, assumptions, and benchmark behavior were reviewed against the challenge requirements, and the three benchmark borrowers run against the real implementation via `tests/scenarios/scenarios.test.ts`, `tests/rules/engine.test.ts`, and `tests/rules/emi.test.ts` (`npm test` to verify).

## Further Docs

**[RULES.md](./RULES.md)** (assumptions & rationale) · **[docs/THREE_RUNTHROUGHS.md](./docs/THREE_RUNTHROUGHS.md)** (benchmark walkthroughs) · **[docs/WALKTHROUGH.md](./docs/WALKTHROUGH.md)** (product flow)

---

## Final Position

Borrower Copilot isn't trying to answer *"How much money will a lender give me?"* It's trying to answer *"What can I reasonably afford, what pricing should I negotiate for, and what should I be comfortable agreeing to?"* — that distinction is the core design decision behind the system.

**Status:** Challenge implementation complete.
