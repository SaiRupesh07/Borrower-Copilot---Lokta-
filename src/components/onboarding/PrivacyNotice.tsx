export function PrivacyNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="bc-content">
      <p className="bc-eyebrow">Before we start</p>
      <h2 className="bc-question-title">Nothing you tell us leaves this browser tab.</h2>
      <p className="bc-help">Here's exactly what that means.</p>

      <ul className="bc-privacy-list">
        <li>🔒 No login or sign-up.</li>
        <li>🏦 No credit bureau pull, and no impact on your actual credit score.</li>
        <li>🌐 No backend server - every calculation runs locally, in your browser.</li>
        <li>🗑️ No personal data is saved. Refresh the page and it's gone.</li>
        <li>↩️ You can skip any question you're unsure of - we'll widen our estimates instead of guessing.</li>
      </ul>

      <div className="bc-actions">
        <button className="bc-btn bc-btn-primary" onClick={onContinue}>
          I understand, let's begin
        </button>
      </div>
    </div>
  );
}
