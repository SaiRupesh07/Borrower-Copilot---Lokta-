import type { BorrowerAssessment } from '../../domain/results';
import type { BorrowerProfile } from '../../domain/borrower';
import { formatINR, formatINRRange } from '../../utils/currency';
import { formatPercentRange } from '../../utils/percentage';
import { ConfidenceBadge, WhyToggle } from '../common/Badge';
import { TopBar } from '../common/TopBar';

const VERDICT_COPY: Record<BorrowerAssessment['verdict']['verdict'], { label: string; cls: string }> = {
  BORROW: { label: 'Borrow', cls: 'bc-verdict-borrow' },
  BORROW_LESS: { label: 'Borrow less', cls: 'bc-verdict-less' },
  DONT_BORROW: { label: "Don't borrow", cls: 'bc-verdict-dont' },
};

export function ResultsScreen({
  profile,
  assessment,
  onBack,
  onStartOver,
  onViewCard,
}: {
  profile: BorrowerProfile;
  assessment: BorrowerAssessment;
  onBack: () => void;
  onStartOver: () => void;
  onViewCard: () => void;
}) {
  const verdictMeta = VERDICT_COPY[assessment.verdict.verdict];

  return (
    <div className="bc-content" style={{ padding: 0 }}>
      <TopBar onBack={onBack} onStartOver={onStartOver} />
      <div className="bc-content">
        <p className="bc-eyebrow">Your assessment</p>
        <h2 className="bc-question-title" style={{ marginBottom: 4 }}>
          Here's where you stand
        </h2>
        <p className="bc-help">{profile.loanProduct.replace(/_/g, ' ')} · {formatINR(profile.requestedAmount)} requested</p>

        <div className={`bc-verdict-banner ${verdictMeta.cls}`}>
          <div className="bc-verdict-label">{verdictMeta.label}</div>
          <p className="bc-verdict-body">{assessment.verdict.headline}</p>
          {assessment.verdict.reasons.length > 0 && (
            <ul className="bc-verdict-reasons">
              {assessment.verdict.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Output 2: amount */}
        <div className="bc-card">
          <div className="bc-card-title">How much - keep these numbers distinct</div>
          <div className="bc-two-col">
            <div>
              <div className="bc-figure-sub">Safe borrowing range</div>
              <div className="bc-figure" style={{ fontSize: 20 }}>
                {formatINRRange(assessment.amount.safeAmount.value.min, assessment.amount.safeAmount.value.max)}
              </div>
              <ConfidenceBadge level={assessment.amount.safeAmount.confidence} />
            </div>
            <div>
              <div className="bc-figure-sub">Recommended safe amount</div>
              <div className="bc-figure" style={{ fontSize: 20 }}>
                {formatINR(assessment.amount.recommendedSafeAmount.value)}
              </div>
              <ConfidenceBadge level={assessment.amount.recommendedSafeAmount.confidence} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="bc-figure-sub">Indicative lender sanction (not a safe recommendation)</div>
            <div className="bc-figure" style={{ fontSize: 20 }}>
              {formatINRRange(
                assessment.amount.likelyLenderSanction.value.min,
                assessment.amount.likelyLenderSanction.value.max,
              )}
            </div>
            <ConfidenceBadge level={assessment.amount.likelyLenderSanction.confidence} />
          </div>
          <p className="bc-divider-note">
            These are different numbers. Use the recommended safe amount when deciding how much to borrow - the
            lender estimate is indicative only, not an approval.
          </p>
          <WhyToggle why={assessment.amount.recommendedSafeAmount.why} />
        </div>

        {/* Output 3: fair rate + APR */}
        <div className="bc-card">
          <div className="bc-card-title">Fair interest rate</div>
          <div className="bc-figure">
            {formatPercentRange(assessment.rate.fairRateAnnual.value.min, assessment.rate.fairRateAnnual.value.max)}
          </div>
          <ConfidenceBadge level={assessment.rate.fairRateAnnual.confidence} />
          <WhyToggle why={assessment.rate.fairRateAnnual.why} />
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
            <div className="bc-card-title">Indicative all-in APR</div>
            <div className="bc-figure" style={{ fontSize: 20 }}>
              {formatPercentRange(assessment.apr.indicativeApr.value.min, assessment.apr.indicativeApr.value.max)}
            </div>
            <p className="bc-figure-sub">
              Processing fee assumed: {assessment.apr.processingFeePercent}%
              {assessment.apr.quotedRate !== undefined && ` · Lender quoted ${assessment.apr.quotedRate}%`}
            </p>
            <WhyToggle why={assessment.apr.methodologyNote} />
          </div>
        </div>

        {/* Output 4: EMI ceiling */}
        <div className="bc-card">
          <div className="bc-card-title">Safe EMI ceiling</div>
          <div className="bc-figure">{formatINR(assessment.emi.safeMonthlyEmiCeiling.value)}/month</div>
          <ConfidenceBadge level={assessment.emi.safeMonthlyEmiCeiling.confidence} />
          <WhyToggle why={assessment.emi.safeMonthlyEmiCeiling.why} />

          <div style={{ marginTop: 14 }}>
            <table className="bc-scenario-table">
              <thead>
                <tr>
                  <th>Tenure</th>
                  <th>EMI</th>
                  <th>Total interest</th>
                </tr>
              </thead>
              <tbody>
                {assessment.emi.scenarios.map((s) => (
                  <tr key={s.tenureMonths} className={s.exceedsSafeCeiling ? 'bc-scenario-row-exceeds' : ''}>
                    <td>
                      {s.tenureMonths} mo{s.tenureMonths === assessment.emi.recommendedTenureMonths ? ' ★' : ''}
                    </td>
                    <td>{formatINR(s.emi)}</td>
                    <td>{formatINR(s.totalInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bc-figure-sub" style={{ marginTop: 8 }}>
              ★ recommended tenure · rows in red exceed your safe EMI ceiling
            </p>
          </div>
        </div>

        {/* Stress test */}
        <div className="bc-card">
          <div className="bc-card-title">Stress test</div>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>{assessment.stress.narrative}</p>
        </div>

        {/* Routing note */}
        {assessment.routing.note && (
          <div className="bc-card" style={{ background: 'var(--primary-tint)', borderColor: 'var(--primary)' }}>
            <div className="bc-card-title">A different path might suit you better</div>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>{assessment.routing.recommendedProductPath}</p>
            <p className="bc-figure-sub" style={{ marginTop: 6 }}>
              {assessment.routing.note}
            </p>
          </div>
        )}

        <div className="bc-actions">
          <button className="bc-btn bc-btn-primary" onClick={onViewCard}>
            View my negotiation card
          </button>
        </div>
        <p className="bc-disclaimer">
          This is a borrower self-assessment based on what you told us - not a lender approval or credit
          decision. Overall confidence: {assessment.overallConfidence}.
        </p>
      </div>
    </div>
  );
}
