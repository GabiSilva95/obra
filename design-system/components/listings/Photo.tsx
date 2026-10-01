import type { CSSProperties } from 'react';
import { Icon } from '../core/Icon';

/** Rounded photo frame; renders a striped placeholder when there is no src. */
export interface PhotoProps { src?: string; alt?: string; style?: CSSProperties; }

export function Photo({ src, alt = '', style }: PhotoProps) {
  if (src) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)', display: 'block', ...style }} />;
  return (
    <div role="img" aria-label={alt || 'Sem foto'} style={{
      width: '100%', height: '100%', borderRadius: 'var(--radius-sm)',
      background: 'repeating-linear-gradient(135deg,var(--surface-placeholder-a) 0 var(--space-2-5),var(--surface-placeholder-b) var(--space-2-5) var(--space-5))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-placeholder-icon)', ...style,
    }}><Icon name="image" size={22} /></div>
  );
}
