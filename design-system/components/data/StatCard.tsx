import type { CSSProperties, ReactNode } from 'react';

/** KPI tile: large coloured numeral + label. Use the four --stat-N colours in order. */
export interface StatCardProps { value: ReactNode; label: string; /** CSS colour, default var(--stat-1) */ color?: string; icon?: ReactNode; style?: CSSProperties; }

export function StatCard({ value, label, color = 'var(--stat-1)', icon, style }: StatCardProps) {
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)', padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0, ...style }}>
      {icon}
      <span style={{ font: 'var(--type-stat)', color, fontSize: 'clamp(var(--fs-h4), 2.4vw, var(--fs-stat))', overflowWrap: 'anywhere' }}>{value}</span>
      <span style={{ fontSize: 'var(--fs-p4-5)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );
}
