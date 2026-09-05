export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="bc-content">
      <div className="bc-landing-hero">
        <p className="bc-eyebrow">Borrower Copilot</p>
        <h1 className="bc-landing-title">Know your number before the lender tells you theirs.</h1>
        <p className="bc-landing-sub">
          A private, self-assessment tool for Indian borrowers. Answer a few questions and get a
          one-screen card you can take to any branch.
        </p>
      </div>

      <div className="bc-ledger">
        <div className="bc-ledger-row">
          <span className="bc-ledger-num">1</span>
          <span className="bc-ledger-text">Should I borrow at all?</span>
        </div>
        <div className="bc-ledger-row">
          <span className="bc-ledger-num">2</span>
          <span className="bc-ledger-text">How much am I really eligible for?</span>
        </div>
        <div className="bc-ledger-row">
          <span className="bc-ledger-num">3</span>
          <span className="bc-ledger-text">What is a fair interest rate for my profile?</span>
        </div>
        <div className="bc-ledger-row">
          <span className="bc-ledger-num">4</span>
          <span className="bc-ledger-text">What EMI should I agree to?</span>
        </div>
      </div>

      <div className="bc-actions">
        <button className="bc-btn bc-btn-primary" onClick={onStart}>
          Start my assessment
        </button>
        <p className="bc-disclaimer">
          This is a self-assessment, not a lender approval or credit decision.
        </p>
      </div>
    </div>
  );
}
