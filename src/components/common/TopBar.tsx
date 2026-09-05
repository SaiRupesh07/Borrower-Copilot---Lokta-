export function TopBar({
  onBack,
  progress,
  progressLabel,
  onStartOver,
}: {
  onBack?: () => void;
  progress?: number; // 0-1
  progressLabel?: string;
  onStartOver?: () => void;
}) {
  return (
    <div className="bc-topbar">
      {onBack ? (
        <button className="bc-back" onClick={onBack} aria-label="Go back">
          ‹ Back
        </button>
      ) : (
        <span style={{ width: 0 }} />
      )}
      {progress !== undefined && (
        <div className="bc-progress-track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="bc-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {progressLabel && <span className="bc-progress-label">{progressLabel}</span>}
      {onStartOver && (
        <button className="bc-back" onClick={onStartOver} aria-label="Start over and clear my answers">
          Start over
        </button>
      )}
    </div>
  );
}
