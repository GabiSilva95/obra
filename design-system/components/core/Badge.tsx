import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'danger' | 'error' | 'neutral' | 'warning' | 'info' | 'cyan' | 'success' | 'electric' | 'orange' | 'accent' | 'dark';

/** Solid status label for order / payment / project states. */
export interface BadgeProps {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  style?: CSSProperties;
  children?: ReactNode;
}

const T: Record<BadgeTone, [bg: string, fg: string]> = {
  danger: ['var(--cp-data-pink)', 'var(--text-on-solid)'],
  error: ['var(--status-danger)', 'var(--text-on-solid)'],
  neutral: ['var(--cp-gray-500)', 'var(--text-on-solid)'],
  warning: ['var(--status-warning)', 'var(--text-on-bright)'],
  info: ['var(--status-info)', 'var(--text-on-solid)'],
  cyan: ['var(--cp-data-turquoise)', 'var(--text-on-bright)'],
  success: ['var(--status-success)', 'var(--text-on-solid)'],
  electric: ['var(--cp-success)', 'var(--text-on-bright)'],
  orange: ['var(--cp-data-orange)', 'var(--text-on-solid)'],
  accent: ['var(--accent)', 'var(--text-on-accent)'],
  dark: ['var(--surface-inverse)', 'var(--text-inverse)'],
};

export function Badge({ tone = 'neutral', size = 'md', children, style }: BadgeProps) {
  const [bg, fg] = T[tone] ?? T.neutral;
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1-5)', height: sm ? 'var(--space-5)' : 'var(--space-6-5)', padding: sm ? '0 var(--space-2)' : '0 var(--space-2-5)',
      borderRadius: 'var(--radius-xs)', background: bg, color: fg, fontSize: sm ? 'var(--fs-caption)' : 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)',
      whiteSpace: 'nowrap', lineHeight: 'var(--lh-none)', ...style,
    }}>{children}</span>
  );
}
