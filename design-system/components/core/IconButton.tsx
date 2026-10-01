import { useState, type CSSProperties, type MouseEvent } from 'react';
import { Icon } from './Icon';
import type { IconName } from './iconData';

export type IconButtonVariant = 'ghost' | 'outline' | 'dark' | 'danger' | 'inverse';

/** Square icon-only button (header actions, row edit/delete, calendar arrows). */
export interface IconButtonProps {
  icon: IconName;
  variant?: IconButtonVariant;
  /** px, default 36 */
  size?: number;
  iconSize?: number;
  /** Count shown in an orange dot */
  badge?: number | string;
  /** Accessible label (required for a11y) */
  label?: string;
  round?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
}

const V: Record<IconButtonVariant, [bg: string, fg: string, hover: string, border: string]> = {
  ghost: ['transparent', 'var(--text-primary)', 'var(--surface-hover)', 'none'],
  outline: ['var(--surface-control)', 'var(--text-primary)', 'var(--surface-hover)', 'var(--border-w) solid var(--border-default)'],
  dark: ['var(--action-primary-bg)', 'var(--action-primary-fg)', 'var(--action-primary-hover)', 'none'],
  danger: ['var(--action-danger-bg)', 'var(--action-danger-fg)', 'var(--action-danger-hover)', 'none'],
  inverse: ['transparent', 'var(--text-on-sidebar)', 'var(--surface-sidebar-hover)', 'none'],
};

export function IconButton({ icon, variant = 'ghost', size = 36, iconSize, badge, label, onClick, round, disabled, style }: IconButtonProps) {
  const [bg, fg, hov, bd] = V[variant] ?? V.ghost;
  const [h, setH] = useState(false);
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: h && !disabled ? hov : bg, color: fg, border: bd, borderRadius: round ? '50%' : 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0, transition: 'background var(--dur-fast)', ...style,
      }}>
      <Icon name={icon} size={iconSize || Math.round(size * 0.56)} />
      {badge ? (
        <span style={{
          position: 'absolute', top: 'var(--space-1)', right: 'var(--space-1)', minWidth: 'var(--space-4)', height: 'var(--space-4)', padding: '0 var(--space-1)', borderRadius: 'var(--radius-pill)',
          background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-extrabold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-w-thick) solid var(--bg-app)',
        }}>{badge}</span>
      ) : null}
    </button>
  );
}
