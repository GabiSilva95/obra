import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../core/Icon';

/** Label + control + helper/error line shared by Input, Select and Textarea. */
export interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  /** Tooltip text shown via the ⓘ next to the label */
  info?: string;
  helper?: ReactNode;
  /** Error message; turns the helper red */
  error?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Field({ label, required, info, helper, error, children, style }: FieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)', minWidth: 0, ...style }}>
      {label && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
          {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
          {label}
          {info && <span title={info} style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}><Icon name="info" size={12} /></span>}
        </span>
      )}
      {children}
      {(helper || error) && (
        <span role={error ? 'alert' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-medium)', color: error ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
          <Icon name="info" size={11} />{error || helper}
        </span>
      )}
    </label>
  );
}

export function controlBox(focus: boolean, error: unknown, disabled: boolean | undefined): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)', height: 'var(--control-h-md)', padding: '0 var(--space-3)',
    background: disabled ? 'var(--surface-control-disabled)' : 'var(--surface-control)',
    border: 'var(--border-w) solid ' + (error ? 'var(--status-danger)' : focus ? 'var(--border-focus)' : 'var(--border-default)'),
    borderRadius: 'var(--radius-xs)', boxShadow: focus && !error ? 'var(--ring-focus)' : 'none',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)', color: 'var(--text-primary)', opacity: disabled ? 0.6 : 1,
  };
}

export const controlReset: CSSProperties = {
  flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-medium)', color: 'inherit', height: '100%',
};
