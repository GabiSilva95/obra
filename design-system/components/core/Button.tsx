import { forwardRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './iconData';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'link' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Action button. Dark "primary" is the default CTA; "accent" (orange) is reserved for one hero action per view. */
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon name shown before label */
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Shows a spinner, sets aria-busy and blocks clicks */
  loading?: boolean;
  type?: 'button' | 'submit';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const V: Record<ButtonVariant, { background: string; color: string; hover: string; underline?: boolean }> = {
  primary: { background: 'var(--action-primary-bg)', color: 'var(--action-primary-fg)', hover: 'var(--action-primary-hover)' },
  accent: { background: 'var(--accent)', color: 'var(--text-on-accent)', hover: 'var(--accent-hover)' },
  secondary: { background: 'var(--action-secondary-bg)', color: 'var(--action-secondary-fg)', hover: 'var(--action-secondary-hover)' },
  ghost: { background: 'transparent', color: 'var(--action-ghost-fg)', hover: 'var(--action-ghost-hover)' },
  link: { background: 'transparent', color: 'var(--action-ghost-fg)', hover: 'transparent', underline: true },
  danger: { background: 'var(--action-danger-bg)', color: 'var(--action-danger-fg)', hover: 'var(--action-danger-hover)' },
};
const S: Record<ButtonSize, { h: string; px: number; fs: number; ic: number }> = {
  sm: { h: 'var(--control-h-sm)', px: 12, fs: 12, ic: 14 },
  md: { h: 'var(--control-h-md)', px: 16, fs: 14, ic: 16 },
  lg: { h: 'var(--control-h-lg)', px: 24, fs: 16, ic: 18 },
};

export function Spinner({ size = 14 }: { size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', border: 'var(--border-w-thick) solid currentColor', borderRightColor: 'transparent', animation: 'ds-spin .7s linear infinite' }} />;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', iconLeft, iconRight, fullWidth, disabled, loading, children, onClick, type = 'button', title, style }, ref) {
  const v = V[variant] ?? V.primary, s = S[size] ?? S.md;
  const [h, setH] = useState(false);
  const off = disabled || loading;
  return (
    <button ref={ref} type={type} disabled={off} aria-busy={loading || undefined} onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onMouseDown={e => { if (!off) e.currentTarget.style.transform = 'scale(.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = ''; }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', height: s.h, padding: `0 ${s.px}px`,
        width: fullWidth ? '100%' : undefined, background: h && !off ? v.hover : v.background, color: v.color, border: 0,
        borderRadius: 'var(--radius-sm)', font: 'inherit', fontSize: s.fs, fontWeight: 'var(--fw-semibold)' as CSSProperties['fontWeight'],
        textDecoration: v.underline && h ? 'underline' : 'none', textUnderlineOffset: 3,
        cursor: loading ? 'progress' : disabled ? 'not-allowed' : 'pointer', opacity: disabled && !loading ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast)', whiteSpace: 'nowrap', ...style,
      }}>
      {loading ? <Spinner size={s.ic} /> : iconLeft && <Icon name={iconLeft} size={s.ic} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={s.ic} />}
    </button>
  );
});
