import { useEffect, type ReactNode } from 'react';
import { IconButton } from '../core/IconButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** Dialog over a blurred scrim: centered card on desktop, bottom sheet below 640px. Esc and scrim click close it. */
export interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  /** 760px instead of 500px */
  wide?: boolean;
  /** Sticky action row at the bottom (e.g. Cancelar / Salvar) */
  footer?: ReactNode;
  children?: ReactNode;
}

export function Modal({ title, onClose, wide, footer, children }: ModalProps) {
  const sheet = useMediaQuery('(max-width: 639px)');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', display: 'flex', alignItems: sheet ? 'flex-end' : 'center', justifyContent: 'center',
      padding: sheet ? 0 : 'var(--space-4)', background: 'var(--scrim)', backdropFilter: 'blur(var(--blur-scrim))',
    }}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: wide ? 'var(--modal-w-wide)' : 'var(--modal-w)', maxHeight: sheet ? '92dvh' : '88vh', display: 'flex', flexDirection: 'column',
          background: 'var(--surface-raised)', border: 'var(--border-w) solid var(--border-card)', boxShadow: 'var(--shadow-pop)',
          borderRadius: sheet ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)', paddingBottom: sheet ? 'env(safe-area-inset-bottom, 0px)' : 0,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: 'var(--border-w) solid var(--border-subtle)' }}>
          <h2 style={{ margin: 0, font: 'var(--type-card-title)', fontSize: 'var(--fs-h5)' }}>{title}</h2>
          <IconButton icon="x" size={32} label="Fechar" onClick={onClose} />
        </div>
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-5)', borderTop: 'var(--border-w) solid var(--border-subtle)' }}>{footer}</div>}
      </div>
    </div>
  );
}
