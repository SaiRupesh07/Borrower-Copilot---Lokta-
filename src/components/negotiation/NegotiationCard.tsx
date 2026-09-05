import type { BorrowerAssessment } from '../../domain/results';
import type { BorrowerProfile } from '../../domain/borrower';
import { formatINR, formatINRRange } from '../../utils/currency';
import { formatPercentRange } from '../../utils/percentage';
import { TopBar } from '../common/TopBar';

const VERDICT_LABEL: Record<BorrowerAssessment['verdict']['verdict'], string> = {
  BORROW: 'Borrow',
  BORROW_LESS: 'Borrow less',
  DONT_BORROW: "Don't borrow",
};

function buildNegotiationPrompts(assessment: BorrowerAssessment): string[] {
  const prompts = [
    'Please show me the APR including all processing fees.',
    'Please show the total amount payable over the full tenure.',
    `Please keep the loan amount near or below my recommended safe amount of ${formatINR(
      assessment.amount.recommendedSafeAmount.value,
    )}, and the EMI at or below ${formatINR(assessment.emi.safeMonthlyEmiCeiling.value)}.`,
  ];
  if (assessment.apr.quotedRate !== undefined && assessment.apr.quotedRate > assessment.rate.fairRateAnnual.value.max) {
    prompts.push('Your quoted rate is above my indicative fair range - what rate or fee adjustment can you offer?');
  } else {
    prompts.push(
      `Given my profile, I understand a fair rate is around ${formatPercentRange(assessment.rate.fairRateAnnual.value.min, assessment.rate.fairRateAnnual.value.max)} - can you match that?`,
    );
  }
  return prompts;
}

export function NegotiationCard({
  profile,
  assessment,
  onBack,
  onStartOver,
}: {
  profile: BorrowerProfile;
  assessment: BorrowerAssessment;
  onBack: () => void;
  onStartOver: () => void;
}) {
  const prompts = buildNegotiationPrompts(assessment);

  return (
    <div className="bc-content" style={{ padding: 0 }}>
      <TopBar onBack={onBack} onStartOver={onStartOver} />
      <div className="bc-content">
        <p className="bc-eyebrow">Negotiation card</p>
        <h2 className="bc-question-title" style={{ marginBottom: 16 }}>
          Show this at the branch
        </h2>

        <div className="bc-negotiation-card">
          <div className="bc-negotiation-header">
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                {VERDICT_LABEL[assessment.verdict.verdict]}
              </div>
              <div className="bc-figure-sub">{profile.loanProduct.replace(/_/g, ' ')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bc-figure-sub">Confidence</div>
              <div style={{ fontWeight: 600 }}>{assessment.overallConfidence}</div>
            </div>
          </div>

          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Requested</span>
            <span className="bc-negotiation-row-value">{formatINR(profile.requestedAmount)}</span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Safe borrowing range</span>
            <span className="bc-negotiation-row-value">
              {formatINRRange(assessment.amount.safeAmount.value.min, assessment.amount.safeAmount.value.max)}
            </span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Recommended safe amount</span>
            <span className="bc-negotiation-row-value">{formatINR(assessment.amount.recommendedSafeAmount.value)}</span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Indicative lender sanction (not safe amount)</span>
            <span className="bc-negotiation-row-value">
              {formatINRRange(
                assessment.amount.likelyLenderSanction.value.min,
                assessment.amount.likelyLenderSanction.value.max,
              )}
            </span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Safe EMI ceiling</span>
            <span className="bc-negotiation-row-value">{formatINR(assessment.emi.safeMonthlyEmiCeiling.value)}/mo</span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Fair interest rate</span>
            <span className="bc-negotiation-row-value">
              {formatPercentRange(assessment.rate.fairRateAnnual.value.min, assessment.rate.fairRateAnnual.value.max)}
            </span>
          </div>
          <div className="bc-negotiation-row">
            <span className="bc-negotiation-row-label">Indicative all-in APR</span>
            <span className="bc-negotiation-row-value">
              {formatPercentRange(assessment.apr.indicativeApr.value.min, assessment.apr.indicativeApr.value.max)}
            </span>
          </div>
          <div className="bc-negotiation-row" style={{ borderBottom: 'none' }}>
            <span className="bc-negotiation-row-label">Recommended tenure</span>
            <span className="bc-negotiation-row-value">{assessment.emi.recommendedTenureMonths} months</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="bc-card-title">Why this is fair</div>
            <ul className="bc-verdict-reasons" style={{ marginTop: 4 }}>
              {assessment.rate.factors.slice(0, 3).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="bc-card-title">Stress case</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{assessment.stress.narrative}</p>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="bc-card-title">Ask the lender</div>
            <ul className="bc-prompt-list">
              {prompts.map((p, i) => (
                <li key={i}>"{p}"</li>
              ))}
            </ul>
          </div>

          <p className="bc-disclaimer">This is a borrower self-assessment, not a lender approval or credit decision.</p>
        </div>

        <div className="bc-actions">
          <button className="bc-btn bc-btn-ghost" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
