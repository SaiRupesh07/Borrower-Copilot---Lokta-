# Walkthrough script (5 minutes)

## 0:00–0:30 — Problem and product philosophy

"Borrower Copilot is a self-assessment tool for Indian borrowers, built
around one insight: most people walk into a loan negotiation not knowing
what a fair number even looks like for their own profile. The product
answers four questions - should I borrow, how much, at what rate, and
what EMI - and it's deliberately borrower-first: the amount a lender
might sanction, the safe borrowing range, and a conservative amount to
start from are shown as distinct numbers, on purpose, because conflating them is exactly what
gets people over-extended. There's no ML credit score: the borrower may
optionally provide their own score, but the tool never pulls or invents one.
Everything is an explicit, documented rule, and 'I don't know' is always a first-class
answer that widens a range instead of getting silently guessed away."

## 0:30–1:30 — Question flow and adaptive design

"The flow is progressive disclosure: privacy notice first, then about
nine must-answer questions - purpose, product, amount, age, how you
earn, income, existing EMIs, expenses, credit score. Everything after
that is adaptive. A salaried applicant gets asked about employer tenure
and variable income share; a self-employed applicant gets asked about
ITR income and business tenure instead; an informal-income applicant
gets asked about dependents and recent bounces. Every adaptive question
in the code declares which outputs it affects - if a question doesn't
change a number, a range, the verdict, or the confidence level, it
doesn't get asked. You can see that mapping directly in
`src/data/questions.ts`."

## 1:30–2:30 — Priya walkthrough

"Priya's a 29-year-old software engineer, ₹1.1L a month, 780 credit
score, asking for an ₹8L personal loan for a wedding. She lands in
BORROW - her required EMI fits well inside her safe ceiling of ₹41,000 a
month, which is actually the tighter of two checks the engine runs: a
FOIR-based check and an expense-based check, and we always take the more
conservative one. Her pricing range is comparatively narrow - 9.5% to
13.15% - because her credit score and income are both fully known, so
confidence is high. And you can see right on screen: her safe repayment
range, a conservative recommended safe amount, and the lender's likely sanction
are shown as distinct figures, with a line that says explicitly which
number is safe to use."

## 2:30–3:30 — Ravi walkthrough

"Ravi runs a kirana store, 14 years, cash income that swings between
₹40,000 and ₹80,000 a month, no credit score on file, but he owns his
shop premises worth about ₹45 lakh outright. This is where the routing
logic kicks in: because he's self-employed, has usable collateral, and
his purpose is productive - restocking and a delivery vehicle - the
engine tells him a secured loan against property or a business loan will
likely be cheaper and more achievable than a plain personal loan, and
suggests he ask lenders specifically about that. Critically, his unknown
credit score doesn't get treated as a bad score - it widens his rate
range instead of shifting it up, which you can verify directly in the
test suite. His safe amount stays constrained by his actual cash flow,
even though his collateral is worth far more - that's deliberate."

## 3:30–4:20 — Anita walkthrough

"Anita's a gig worker and tailor, ₹26-30K a month, two kids, three
existing app loans at 30%+ interest, and one bounced EMI last month. She
lands in DONT_BORROW. The engine doesn't run 'income times FOIR equals
approval' - it explicitly checks for severe stress first: a high-cost
existing debt plus a recent bounce together force a Don't Borrow verdict
regardless of the requested amount. Her safe EMI ceiling computes out to
literally zero once you apply her existing obligations against an
already-tightened FOIR. And the scooter's real potential to increase her
delivery income is acknowledged in the data - it's marked as a
productive purpose - but the code and the tests both confirm it does not
override the current stress signal. That was one of the brief's hardest
requirements and it's directly testable."

## 4:20–5:00 — Architecture, limitations, what's next, what I'd cut

"Architecturally, the whole thing is a rules engine with zero React
dependency - `calculateBorrowerAssessment(profile)` is a pure function
you can call from a test, a script, or a different UI entirely, and
every number it returns carries its own confidence level and a
plain-language 'why'. Every threshold - FOIR ceilings, rate adjustments,
haircuts - is centralized in one file and documented in RULES.md with a
what/value/why/source table, tagged honestly as either market
observation or my own judgement, because almost none of this is
regulation. The main limitation is that the product rate bands are broad
market indications, not live lender data, and the APR is an indicative
periodic cash-flow IRR estimate, not a certified lender disclosure;
invalid inputs use a documented fallback. The stress test is income-only
and does not claim a rate shock. All of this is stated explicitly in the
UI. If I had more time I'd add real lender-rate
data and multi-offer comparison. What I intentionally left out: any kind
of backend, bureau pull, or an invented credit score - the brief was explicit
that this is a self-assessment tool, and building fake certainty into it
would undermine the entire point."
