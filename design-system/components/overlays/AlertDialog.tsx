import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

/** Centered system notice or confirmation: tone icon, title, message and actions. Enter confirms, Esc cancels. */
export interface AlertDialogProps {
  tone?: AlertTone;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  /** Shows a Cancelar button (confirmation mode) */
  cancelLabel?: string;
  /** Confirm button uses the danger variant */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE: Record<AlertTone, { icon: IconName; color: string; soft: string }> = {
  success: { icon: 'check', color: 'var(--status-success)', soft: 'var(--status-success-soft)' },
  error: { icon: 'x', color: 'var(--status-danger)', soft: 'var(--status-danger-soft)' },
  warning: { icon: 'triangle-alert', color: 'var(--status-warning-text)', soft: 'var(--status-warning-soft)' },
  info: { icon: 'info', color: 'var(--status-info-text)', soft: 'var(--status-info-soft)' },
};

export function AlertDialog({ tone = 'info', title, message, confirmLabel = 'Entendi', cancelLabel, danger, onConfirm, onCancel }: AlertDialogProps) {
  const t = TONE[tone];
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dialog)', background: 'var(--scrim)', backdropFilter: 'blur(var(--blur-scrim))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)' }}>
      <div role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 'var(--dialog-w)', background: 'var(--surface-raised)', border: 'var(--border-w) solid var(--border-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-pop)', padding: 'var(--space-8) var(--space-6) var(--space-6)', textAlign: 'center' }}>
        <div style={{ width: 'var(--space-16)', height: 'var(--space-16)', borderRadius: '50%', margin: '0 auto var(--space-4)', background: t.soft, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={t.icon} size={28} stroke={2.4} />
        </div>
        {title && <div style={{ fontSize: 'var(--fs-h5)', fontWeight: 'var(--fw-extrabold)', marginBottom: 'var(--space-2)', textWrap: 'balance' }}>{title}</div>}
        {message && <div style={{ fontSize: 'var(--fs-p5-5)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-body)', marginBottom: 'var(--space-6)' }}>{message}</div>}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexDirection: cancelLabel ? 'row' : 'column' }}>
          {cancelLabel && <Button variant="secondary" fullWidth onClick={onCancel}>{cancelLabel}</Button>}
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
