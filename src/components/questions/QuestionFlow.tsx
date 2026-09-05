import { useMemo, useState } from 'react';
import type { BorrowerProfileDraft, ExistingLoan } from '../../domain/borrower';
import {
  MUST_QUESTIONS,
  LOAN_PURPOSES,
  LOAN_PRODUCT_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  visibleQuestions,
  type QuestionDef,
} from '../../data/questions';
import { TopBar } from '../common/TopBar';


function set<K extends keyof BorrowerProfileDraft>(
  draft: BorrowerProfileDraft,
  setDraft: (d: BorrowerProfileDraft) => void,
  key: K,
  value: BorrowerProfileDraft[K],
) {
  setDraft({ ...draft, [key]: value });
}

export function QuestionFlow({
  draft,
  setDraft,
  onComplete,
  onExit,
  onStartOver,
}: {
  draft: BorrowerProfileDraft;
  setDraft: (d: BorrowerProfileDraft) => void;
  onComplete: () => void;
  onExit: () => void;
  onStartOver: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const questions = useMemo(() => visibleQuestions(draft), [draft]);
  const q = questions[Math.min(stepIndex, questions.length - 1)];
  const isLast = stepIndex >= questions.length - 1;

  function goNext() {
    if (stepIndex + 1 >= visibleQuestions(draft).length) {
      onComplete();
    } else {
      setStepIndex(stepIndex + 1);
    }
  }
  function goBack() {
    if (stepIndex === 0) onExit();
    else setStepIndex(stepIndex - 1);
  }

  const canContinue = isAnswered(q, draft);

  return (
    <div className="bc-content" style={{ padding: 0 }}>
      <TopBar
        onBack={goBack}
        progress={(stepIndex + 1) / Math.max(questions.length, stepIndex + 1)}
        progressLabel={`${stepIndex + 1} of ~${questions.length}`}
        onStartOver={onStartOver}
      />
      <div className="bc-content">
        <p className="bc-eyebrow">{MUST_QUESTIONS.includes(q) ? 'Must-answer' : 'A bit more detail'}</p>
        <h2 className="bc-question-title">{q.prompt}</h2>
        {q.helpText && <p className="bc-help">{q.helpText}</p>}

        <QuestionInput key={q.id} q={q} draft={draft} setDraft={setDraft} />

        <div className="bc-actions">
          <button className="bc-btn bc-btn-primary" disabled={!canContinue} onClick={goNext}>
            {isLast ? 'See my assessment' : 'Continue'}
          </button>
          {!q.required && (
            <button className="bc-skip" onClick={goNext}>
              Skip - I'm not sure
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function isAnswered(q: QuestionDef, draft: BorrowerProfileDraft): boolean {
  if (!q.required) return true;
  switch (q.field) {
    case 'loanPurpose':
      return !!draft.loanPurpose;
    case 'loanProduct':
      return !!draft.loanProduct;
    case 'requestedAmount':
      return typeof draft.requestedAmount === 'number' && draft.requestedAmount > 0;
    case 'age':
      return typeof draft.age === 'number' && draft.age >= 18 && draft.age <= 90;
    case 'employmentType':
      return !!draft.employmentType;
    case 'netMonthlyIncome':
      return draft.netMonthlyIncome?.status === 'known' || draft.netMonthlyIncome?.status === 'range';
    case 'existingEmis':
      return Array.isArray(draft.existingEmis);
    case 'householdMonthlyExpenses':
      return draft.householdMonthlyExpenses !== undefined;
    case 'creditScore':
      return draft.creditScore !== undefined;
    default:
      return true;
  }
}

function QuestionInput({
  q,
  draft,
  setDraft,
}: {
  q: QuestionDef;
  draft: BorrowerProfileDraft;
  setDraft: (d: BorrowerProfileDraft) => void;
}) {
  switch (q.id) {
    case 'purpose':
      return (
        <div className="bc-option-grid" role="radiogroup" aria-label={q.prompt}>
          {LOAN_PURPOSES.map((p) => (
            <button
              key={p.value}
              className={`bc-option ${draft.loanPurpose === p.value ? 'is-selected' : ''}`}
              role="radio"
              aria-checked={draft.loanPurpose === p.value}
              onClick={() =>
                setDraft({ ...draft, loanPurpose: p.value, isProductivePurpose: draft.isProductivePurpose ?? p.productive })
              }
            >
              <span className="bc-option-title">{p.label}</span>
            </button>
          ))}
        </div>
      );

    case 'product':
      return (
        <div className="bc-option-grid" role="radiogroup" aria-label={q.prompt}>
          {LOAN_PRODUCT_OPTIONS.map((p) => (
            <button
              key={p.value}
              className={`bc-option ${draft.loanProduct === p.value ? 'is-selected' : ''}`}
              role="radio"
              aria-checked={draft.loanProduct === p.value}
              onClick={() => setDraft({ ...draft, loanProduct: p.value })}
            >
              <span className="bc-option-title">{p.label}</span>
            </button>
          ))}
        </div>
      );

    case 'amount':
      return (
        <NumberField
          label="Amount (₹)"
          value={draft.requestedAmount}
          onChange={(v) => set(draft, setDraft, 'requestedAmount', v)}
          placeholder="e.g. 500000"
        />
      );

    case 'age':
      return (
        <NumberField label="Age" value={draft.age} onChange={(v) => set(draft, setDraft, 'age', v)} placeholder="e.g. 32" />
      );

    case 'employmentType':
      return (
        <div className="bc-option-grid" role="radiogroup" aria-label={q.prompt}>
          {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`bc-option ${draft.employmentType === o.value ? 'is-selected' : ''}`}
              role="radio"
              aria-checked={draft.employmentType === o.value}
              onClick={() => setDraft({ ...draft, employmentType: o.value })}
            >
              <span className="bc-option-title">{o.label}</span>
              <span className="bc-option-sub">{o.help}</span>
            </button>
          ))}
        </div>
      );

    case 'income':
      return <IncomeInput draft={draft} setDraft={setDraft} />;

    case 'existingEmis':
      return <ExistingEmisInput draft={draft} setDraft={setDraft} />;

    case 'expenses':
      return (
        <UnknownableNumberField
          label="Monthly expenses (₹)"
          value={draft.householdMonthlyExpenses}
          onChange={(v) => set(draft, setDraft, 'householdMonthlyExpenses', v)}
        />
      );

    case 'creditScore':
      return <CreditScoreInput draft={draft} setDraft={setDraft} />;

    case 'incomeStability':
      return (
        <div className="bc-chip-row" role="radiogroup" aria-label={q.prompt}>
          {(
            [
              ['stable', 'Stable, roughly the same each month'],
              ['somewhat_variable', 'Somewhat variable'],
              ['highly_variable', 'Highly variable'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              className={`bc-chip ${draft.incomeStability?.status === 'known' && draft.incomeStability.value === val ? 'is-selected' : ''}`}
              onClick={() => set(draft, setDraft, 'incomeStability', { status: 'known', value: val })}
            >
              {label}
            </button>
          ))}
          <button
            className={`bc-chip ${draft.incomeStability?.status === 'unknown' ? 'is-selected' : ''}`}
            onClick={() => set(draft, setDraft, 'incomeStability', { status: 'unknown' })}
          >
            Not sure
          </button>
        </div>
      );

    case 'employerTenure':
    case 'businessTenure':
      return (
        <NumberField
          label="Years"
          value={draft.employmentTenureMonths !== undefined ? draft.employmentTenureMonths / 12 : undefined}
          onChange={(v) => set(draft, setDraft, 'employmentTenureMonths', v !== undefined ? Math.round(v * 12) : undefined)}
          placeholder="e.g. 5"
          step={0.5}
        />
      );

    case 'variableIncomeShare':
      return (
        <NumberField
          label="Variable share (%)"
          value={draft.variableIncomeSharePercent}
          onChange={(v) => set(draft, setDraft, 'variableIncomeSharePercent', v)}
          placeholder="e.g. 20"
          max={100}
        />
      );

    case 'itrIncome':
      return (
        <UnknownableNumberField
          label="Annual ITR income (₹)"
          value={draft.documentedAnnualIncome}
          onChange={(v) => set(draft, setDraft, 'documentedAnnualIncome', v)}
        />
      );

    case 'emergencySavings':
      return (
        <UnknownableNumberField
          label="Months of expenses saved"
          value={draft.emergencySavingsMonths}
          onChange={(v) => set(draft, setDraft, 'emergencySavingsMonths', v)}
        />
      );

    case 'ccUtilisation':
      return (
        <NumberField
          label="Utilisation (%)"
          value={draft.creditCardUtilizationPercent}
          onChange={(v) => set(draft, setDraft, 'creditCardUtilizationPercent', v)}
          placeholder="e.g. 40"
          max={100}
        />
      );

    case 'dependents':
      return (
        <NumberField label="Dependents" value={draft.dependents} onChange={(v) => set(draft, setDraft, 'dependents', v)} placeholder="e.g. 2" />
      );

    case 'recentBounce':
      return (
        <div className="bc-chip-row">
          {[0, 1, 2].map((n) => (
            <button
              key={n}
              className={`bc-chip ${draft.recentEmiBounces?.status === 'known' && draft.recentEmiBounces.value === n ? 'is-selected' : ''}`}
              onClick={() => set(draft, setDraft, 'recentEmiBounces', { status: 'known', value: n })}
            >
              {n === 0 ? 'None' : n === 2 ? '2 or more' : '1'}
            </button>
          ))}
          <button
            className={`bc-chip ${draft.recentEmiBounces?.status === 'unknown' ? 'is-selected' : ''}`}
            onClick={() => set(draft, setDraft, 'recentEmiBounces', { status: 'unknown' })}
          >
            Not sure
          </button>
        </div>
      );

    case 'productivePurpose':
      return (
        <div className="bc-chip-row">
          <button
            className={`bc-chip ${draft.isProductivePurpose === true ? 'is-selected' : ''}`}
            onClick={() => set(draft, setDraft, 'isProductivePurpose', true)}
          >
            Yes
          </button>
          <button
            className={`bc-chip ${draft.isProductivePurpose === false ? 'is-selected' : ''}`}
            onClick={() => set(draft, setDraft, 'isProductivePurpose', false)}
          >
            No / not really
          </button>
        </div>
      );

    case 'incrementalIncome':
      return (
        <NumberField
          label="Extra monthly income (₹)"
          value={draft.expectedIncrementalMonthlyIncome}
          onChange={(v) => set(draft, setDraft, 'expectedIncrementalMonthlyIncome', v)}
          placeholder="e.g. 5000"
        />
      );

    case 'collateral':
      return <CollateralInput draft={draft} setDraft={setDraft} />;

    case 'coApplicant':
      return <CoApplicantInput draft={draft} setDraft={setDraft} />;

    case 'lenderOffer':
      return <LenderOfferInput draft={draft} setDraft={setDraft} />;

    default:
      return null;
  }
}

// ---- Small input primitives ----------------------------------------

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  max,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  max?: number;
  step?: number;
}) {
  return (
    <div className="bc-field">
      <label className="bc-label">{label}</label>
      <input
        className="bc-input"
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step ?? 1}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

function UnknownableNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { status: 'known'; value: number } | { status: 'unknown' } | undefined;
  onChange: (v: { status: 'known'; value: number } | { status: 'unknown' }) => void;
}) {
  const known = value?.status === 'known';
  return (
    <div className="bc-field">
      <label className="bc-label">{label}</label>
      <input
        className="bc-input"
        type="number"
        inputMode="decimal"
        min={0}
        value={known ? value.value : ''}
        onChange={(e) => onChange(e.target.value === '' ? { status: 'unknown' } : { status: 'known', value: Number(e.target.value) })}
        placeholder="Enter a number"
      />
      <button
        type="button"
        className="bc-chip"
        style={{ marginTop: 8 }}
        onClick={() => onChange({ status: 'unknown' })}
      >
        {value?.status === 'unknown' ? "✓ Marked as don't know" : "I don't know"}
      </button>
    </div>
  );
}

function IncomeInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const mode = draft.netMonthlyIncome?.status === 'range' ? 'range' : 'known';
  return (
    <div>
      <div className="bc-chip-row" style={{ marginBottom: 14 }}>
        <button
          className={`bc-chip ${mode === 'known' ? 'is-selected' : ''}`}
          onClick={() => setDraft({ ...draft, netMonthlyIncome: { status: 'known', value: draft.netMonthlyIncome?.status === 'known' ? draft.netMonthlyIncome.value : 0 } })}
        >
          I know the exact number
        </button>
        <button
          className={`bc-chip ${mode === 'range' ? 'is-selected' : ''}`}
          onClick={() => setDraft({ ...draft, netMonthlyIncome: { status: 'range', min: 0, max: 0 } })}
        >
          It varies - give a range
        </button>
      </div>
      {mode === 'known' ? (
        <NumberField
          label="Net monthly income (₹)"
          value={draft.netMonthlyIncome?.status === 'known' ? draft.netMonthlyIncome.value : undefined}
          onChange={(v) => setDraft({ ...draft, netMonthlyIncome: { status: 'known', value: v ?? 0 } })}
          placeholder="e.g. 60000"
        />
      ) : (
        <div className="bc-two-col">
          <NumberField
            label="Lowest month (₹)"
            value={draft.netMonthlyIncome?.status === 'range' ? draft.netMonthlyIncome.min : undefined}
            onChange={(v) =>
              setDraft({
                ...draft,
                netMonthlyIncome: { status: 'range', min: v ?? 0, max: draft.netMonthlyIncome?.status === 'range' ? draft.netMonthlyIncome.max : 0 },
              })
            }
          />
          <NumberField
            label="Best month (₹)"
            value={draft.netMonthlyIncome?.status === 'range' ? draft.netMonthlyIncome.max : undefined}
            onChange={(v) =>
              setDraft({
                ...draft,
                netMonthlyIncome: { status: 'range', min: draft.netMonthlyIncome?.status === 'range' ? draft.netMonthlyIncome.min : 0, max: v ?? 0 },
              })
            }
          />
        </div>
      )}
    </div>
  );
}

function ExistingEmisInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const list = draft.existingEmis ?? [];
  function update(list: ExistingLoan[]) {
    setDraft({ ...draft, existingEmis: list });
  }
  return (
    <div>
      {list.map((loan, i) => (
        <div key={i} className="bc-card">
          <div className="bc-two-col" style={{ marginBottom: 10 }}>
            <div className="bc-field" style={{ marginBottom: 0 }}>
              <label className="bc-label">Type</label>
              <select
                className="bc-select"
                value={loan.type}
                onChange={(e) => {
                  const copy = [...list];
                  copy[i] = { ...loan, type: e.target.value as ExistingLoan['type'] };
                  update(copy);
                }}
              >
                {['personal', 'vehicle', 'home', 'gold', 'business', 'app_loan', 'other'].map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="bc-field" style={{ marginBottom: 0 }}>
              <label className="bc-label">EMI (₹/month)</label>
              <input
                className="bc-input"
                type="number"
                min={0}
                value={loan.emi}
                onChange={(e) => {
                  const copy = [...list];
                  copy[i] = { ...loan, emi: Number(e.target.value) };
                  update(copy);
                }}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            <input
              type="checkbox"
              checked={!!loan.isHighCost}
              onChange={(e) => {
                const copy = [...list];
                copy[i] = { ...loan, isHighCost: e.target.checked };
                update(copy);
              }}
            />
            This is a high-cost loan (app-based/informal, 30%+ interest)
          </label>
          <button className="bc-skip" style={{ marginTop: 8 }} onClick={() => update(list.filter((_, idx) => idx !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button
        className="bc-btn bc-btn-ghost"
        type="button"
        onClick={() => update([...list, { type: 'personal', emi: 0 }])}
      >
        + Add an existing EMI
      </button>
      {list.length === 0 && <p className="bc-help" style={{ marginTop: 10 }}>No existing EMIs? Leave this empty and continue.</p>}
    </div>
  );
}

function CreditScoreInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const known = draft.creditScore?.status === 'known';
  return (
    <div className="bc-field">
      <input
        className="bc-input"
        type="number"
        min={300}
        max={900}
        placeholder="e.g. 750"
        value={known ? draft.creditScore!.value : ''}
        onChange={(e) =>
          setDraft({
            ...draft,
            creditScore: e.target.value === '' ? { status: 'unknown' } : { status: 'known', value: Number(e.target.value) },
          })
        }
      />
      <button
        type="button"
        className="bc-chip"
        style={{ marginTop: 8 }}
        onClick={() => setDraft({ ...draft, creditScore: { status: 'unknown' } })}
      >
        {draft.creditScore?.status === 'unknown' ? "✓ Marked as don't know" : "I don't know my score"}
      </button>
    </div>
  );
}

function CollateralInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const c = draft.collateral ?? { hasCollateral: false };
  return (
    <div>
      <div className="bc-chip-row" style={{ marginBottom: 14 }}>
        <button className={`bc-chip ${c.hasCollateral ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, collateral: { ...c, hasCollateral: true } })}>
          Yes
        </button>
        <button className={`bc-chip ${!c.hasCollateral ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, collateral: { hasCollateral: false } })}>
          No
        </button>
      </div>
      {c.hasCollateral && (
        <>
          <div className="bc-field">
            <label className="bc-label">Type</label>
            <select
              className="bc-select"
              value={c.type ?? 'property'}
              onChange={(e) => setDraft({ ...draft, collateral: { ...c, type: e.target.value as any } })}
            >
              {['property', 'gold', 'fixed_deposit', 'vehicle', 'other'].map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            label="Estimated value (₹)"
            value={c.estimatedValue?.status === 'known' ? c.estimatedValue.value : undefined}
            onChange={(v) => setDraft({ ...draft, collateral: { ...c, estimatedValue: v !== undefined ? { status: 'known', value: v } : { status: 'unknown' } } })}
          />
          <div className="bc-field">
            <label className="bc-label">Existing loan against it?</label>
            <select
              className="bc-select"
              value={c.existingEncumbrance ?? 'none'}
              onChange={(e) => setDraft({ ...draft, collateral: { ...c, existingEncumbrance: e.target.value as any } })}
            >
              <option value="none">No existing loan against it</option>
              <option value="partial">Partially pledged / part loan outstanding</option>
              <option value="full">Fully pledged / mortgaged</option>
              <option value="unknown">Not sure</option>
            </select>
          </div>
          <div className="bc-chip-row">
            <button
              className={`bc-chip ${c.ownershipClear?.status === 'known' && c.ownershipClear.value ? 'is-selected' : ''}`}
              onClick={() => setDraft({ ...draft, collateral: { ...c, ownershipClear: { status: 'known', value: true } } })}
            >
              Ownership is clear
            </button>
            <button
              className={`bc-chip ${c.ownershipClear?.status === 'unknown' ? 'is-selected' : ''}`}
              onClick={() => setDraft({ ...draft, collateral: { ...c, ownershipClear: { status: 'unknown' } } })}
            >
              Not sure
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CoApplicantInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const c = draft.coApplicant ?? { hasCoApplicant: false };
  return (
    <div>
      <div className="bc-chip-row" style={{ marginBottom: 14 }}>
        <button className={`bc-chip ${c.hasCoApplicant ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, coApplicant: { ...c, hasCoApplicant: true } })}>
          Yes
        </button>
        <button className={`bc-chip ${!c.hasCoApplicant ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, coApplicant: { hasCoApplicant: false } })}>
          No
        </button>
      </div>
      {c.hasCoApplicant && (
        <NumberField
          label="Their monthly income (₹)"
          value={c.monthlyIncome}
          onChange={(v) => setDraft({ ...draft, coApplicant: { ...c, monthlyIncome: v } })}
        />
      )}
    </div>
  );
}

function LenderOfferInput({ draft, setDraft }: { draft: BorrowerProfileDraft; setDraft: (d: BorrowerProfileDraft) => void }) {
  const o = draft.existingLenderOffer ?? { hasOffer: false };
  return (
    <div>
      <div className="bc-chip-row" style={{ marginBottom: 14 }}>
        <button className={`bc-chip ${o.hasOffer ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, existingLenderOffer: { ...o, hasOffer: true } })}>
          Yes
        </button>
        <button className={`bc-chip ${!o.hasOffer ? 'is-selected' : ''}`} onClick={() => setDraft({ ...draft, existingLenderOffer: { hasOffer: false } })}>
          No
        </button>
      </div>
      {o.hasOffer && (
        <>
          <NumberField label="Quoted interest rate (%)" value={o.quotedInterestRate} onChange={(v) => setDraft({ ...draft, existingLenderOffer: { ...o, quotedInterestRate: v } })} />
          <NumberField label="Processing fee (%)" value={o.processingFeePercent} onChange={(v) => setDraft({ ...draft, existingLenderOffer: { ...o, processingFeePercent: v } })} />
          <NumberField label="Quoted tenure (months)" value={o.quotedTenureMonths} onChange={(v) => setDraft({ ...draft, existingLenderOffer: { ...o, quotedTenureMonths: v } })} />
        </>
      )}
    </div>
  );
}
