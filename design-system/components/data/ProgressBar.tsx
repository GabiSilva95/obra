/** Thin progress track (0–100). Default colour follows the value: info → accent above 70% → success at 100%. */
export interface ProgressBarProps { value?: number; /** CSS colour; overrides the automatic one */ color?: string; height?: number; label?: string; }

export function ProgressBar({ value = 0, color, height = 6, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const bg = color || (pct === 100 ? 'var(--status-success)' : pct > 70 ? 'var(--accent)' : 'var(--status-info)');
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      style={{ width: '100%', height, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: bg, borderRadius: 'var(--radius-pill)', transition: 'width var(--dur-slow) var(--ease-standard)' }} />
    </div>
  );
}
