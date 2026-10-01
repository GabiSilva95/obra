import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'accent';

/** Inline message box: tone icon, optional title, text and action. Error is always icon + text, never colour alone. */
export interface BannerProps {
  tone?: BannerTone;
  title?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  style?: CSSProperties;
  children?: ReactNode;
}

const T: Record<BannerTone, { icon: IconName; fg: string; bg: string }> = {
  info: { icon: 'info', fg: 'var(--status-info-text)', bg: 'var(--status-info-soft)' },
  success: { icon: 'check', fg: 'var(--status-success-text)', bg: 'var(--status-success-soft)' },
  warning: { icon: 'triangle-alert', fg: 'var(--status-warning-text)', bg: 'var(--status-warning-soft)' },
  danger: { icon: 'circle-alert', fg: 'var(--status-danger-text)', bg: 'var(--status-danger-soft)' },
  accent: { icon: 'info', fg: 'var(--text-accent)', bg: 'var(--accent-soft)' },
};

export function Banner({ tone = 'info', title, icon, action, style, children }: BannerProps) {
  const t = T[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: t.bg, color: 'var(--text-primary)', fontSize: 'var(--fs-p5-5)', lineHeight: 'var(--lh-body)', ...style }}>
      <span style={{ color: t.fg, display: 'flex', paddingTop: 'var(--space-0-5)' }}><Icon name={icon ?? t.icon} size={18} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 'var(--fw-bold)', color: t.fg }}>{title}</div>}
        {children}
      </div>
      {action}
    </div>
  );
}
