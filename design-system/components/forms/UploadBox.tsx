import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { Spinner } from '../core/Button';

/** Dashed drop zone for photos, videos and documents. With `onFiles` it opens the file picker and accepts drag-and-drop. */
export interface UploadBoxProps {
  title?: string;
  hint?: ReactNode;
  formats?: string;
  height?: number;
  onClick?: () => void;
  /** Receives picked or dropped files */
  onFiles?: (files: File[]) => void;
  /** Native accept list, e.g. ".xml" */
  accept?: string;
  multiple?: boolean;
  /** Shows a spinner and blocks input */
  busy?: boolean;
  disabled?: boolean;
}

export function UploadBox({ title = 'Enviar arquivo', hint = 'Escolha um arquivo ou arraste e solte aqui.', formats, height = 200, onClick, onFiles, accept, multiple, busy, disabled }: UploadBoxProps) {
  const [h, setH] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const off = busy || disabled;
  const open = () => { if (off) return; if (onFiles) input.current?.click(); onClick?.(); };
  const active = !off && (h || drag);
  return (
    <div onClick={open} role="button" tabIndex={off ? -1 : 0} aria-disabled={off || undefined} aria-busy={busy || undefined}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onDragOver={onFiles ? e => { e.preventDefault(); if (!off) setDrag(true); } : undefined}
      onDragLeave={onFiles ? () => setDrag(false) : undefined}
      onDrop={onFiles ? e => { e.preventDefault(); setDrag(false); if (!off) onFiles([...e.dataTransfer.files]); } : undefined}
      style={{
        height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', padding: 'var(--space-4)', textAlign: 'center',
        background: active ? 'var(--surface-accent-subtle)' : 'var(--surface-sunken)', border: 'var(--border-w-strong) dashed ' + (active ? 'var(--accent)' : 'var(--border-default)'),
        borderRadius: 'var(--radius-md)', cursor: busy ? 'progress' : disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, transition: 'all var(--dur-base)',
      }}>
      {onFiles && <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={e => { onFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1-5)', height: 'var(--control-h-sm)', padding: '0 var(--space-3)', background: 'var(--surface-card)',
        border: 'var(--border-w) solid var(--border-default)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)',
      }}>{busy ? <Spinner size={16} /> : <Icon name="cloud-upload" size={16} />}{title}</span>
      <span style={{ fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)' }}>{hint}</span>
      {formats && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>{formats}</span>}
    </div>
  );
}
