import { useId } from 'react';
import type { ConfidenceLevel } from '../../domain/results';

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cls =
    level === 'HIGH' ? 'bc-badge-high' : level === 'MEDIUM' ? 'bc-badge-medium' : 'bc-badge-low';
  const label = level === 'HIGH' ? 'High confidence' : level === 'MEDIUM' ? 'Medium confidence' : 'Low confidence';
  return <span className={`bc-badge ${cls}`}>{label}</span>;
}

export function WhyToggle({ why }: { why: string }) {
  const id = useId();
  return (
    <details>
      <summary className="bc-why-toggle" style={{ listStyle: 'none', cursor: 'pointer' }}>
        Why?
      </summary>
      <p id={id} className="bc-why-text">
        {why}
      </p>
    </details>
  );
}
