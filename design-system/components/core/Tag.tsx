import type { CSSProperties, ReactNode } from 'react';

export type TagTone = 'accent' | 'neutral' | 'success' | 'danger' | 'dark';

/** Soft pill chip: categories, filters, legend items. */
export interface TagProps {
  tone?: TagTone;
  /** true = currentColor dot, or a CSS colour */
  dot?: boolean | string;
  count?: number;
  /** Selected filter state (dark fill) */
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

const T: Record<TagTone, [bg: string, fg: string]> = {
  accent: ['var(--accent-soft)', 'var(--text-accent)'],
  neutral: ['var(--surface-sunken)', 'var(--text-primary)'],
  success: ['var(--status-success-soft)', 'var(--status-success-text)'],
  danger: ['var(--status-danger-soft)', 'var(--status-danger-text)'],
  dark: ['var(--surface-inverse)', 'var(--text-inverse)'],
};

export function Tag({ tone = 'accent', dot, count, active, onClick, children, style }: TagProps) {
  const [bg, fg] = active ? ['var(--surface-inverse)', 'var(--text-inverse)'] : (T[tone] ?? T.accent);
  const interactive = !!onClick;
  return (
    <span onClick={onClick} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-pressed={interactive ? !!active : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1-5)', height: 'var(--space-7)', padding: '0 var(--space-3)', borderRadius: 'var(--radius-pill)',
        background: bg, color: fg, fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap', cursor: interactive ? 'pointer' : 'default', ...style,
      }}>
      {dot && <span style={{ width: 'var(--space-2)', height: 'var(--space-2)', borderRadius: '50%', background: dot === true ? 'currentColor' : dot }} />}
      {children}
      {count != null && (
        <span style={{
          minWidth: 'var(--space-4)', height: 'var(--space-4)', borderRadius: 'var(--radius-pill)', background: active ? 'var(--accent)' : 'var(--surface-inverse)',
          color: active ? 'var(--text-on-accent)' : 'var(--text-inverse)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-extrabold)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 var(--space-1)',
        }}>{count}</span>
      )}
    </span>
  );
}
