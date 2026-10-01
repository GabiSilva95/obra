import type { CSSProperties } from 'react';

/** Round user image with initials fallback. */
export interface AvatarProps { src?: string; name?: string; size?: number; online?: boolean; style?: CSSProperties; }

export function Avatar({ src, name = '', size = 40, online, style }: AvatarProps) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span style={{
      position: 'relative', width: size, height: size, flexShrink: 0, borderRadius: '50%', background: 'var(--surface-avatar)',
      color: 'var(--text-avatar)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36,
      fontWeight: 'var(--fw-bold)', overflow: 'visible', ...style,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : ini}
      {online && <span style={{ position: 'absolute', right: 0, bottom: 0, width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: 'var(--status-success)', border: 'var(--border-w-thick) solid var(--surface-card)' }} />}
    </span>
  );
}
