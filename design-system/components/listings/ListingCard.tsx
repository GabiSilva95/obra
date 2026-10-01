import type { ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import type { IconName } from '../core/iconData';
import { Photo } from './Photo';

/** Wide record card: hero photo + 2 thumbs, status dot title, label/value attributes, icon feature grid. */
export interface ListingCardProps {
  /** Up to 3 image URLs; missing ones render a striped placeholder */
  images?: string[];
  title: string;
  /** CSS colour for the status dot */
  status?: string;
  attrs?: { label: string; value: ReactNode }[];
  featuresLabel?: string;
  features?: { icon: IconName; label: string }[];
  onMore?: () => void;
  onClick?: () => void;
  /** Mobile: single column, one image */
  stacked?: boolean;
}

export function ListingCard({ images = [], title, status, attrs = [], featuresLabel, features = [], onMore, onClick, stacked }: ListingCardProps) {
  return (
    <article onClick={onClick} style={{ display: 'grid', gridTemplateColumns: stacked ? '1fr' : 'minmax(0,1.6fr) minmax(0,.7fr) minmax(0,3fr)', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ height: stacked ? 'var(--photo-h)' : 'auto', minHeight: 'var(--col-min-sm)' }}><Photo src={images[0]} /></div>
      {!stacked && <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 'var(--space-2)' }}><Photo src={images[1]} /><Photo src={images[2]} /></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3-5)', padding: stacked ? 'var(--space-1) var(--space-1) var(--space-2)' : 'var(--space-2) var(--space-2) var(--space-2) var(--space-3)', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
          {status && <span style={{ width: 'var(--space-3)', height: 'var(--space-3)', borderRadius: '50%', background: status, marginTop: 'var(--space-1-5)', flexShrink: 0 }} />}
          <h3 style={{ margin: 0, flex: 1, fontSize: 'var(--fs-p3)', fontWeight: 'var(--fw-semibold)', lineHeight: 'var(--lh-snug)' }}>{title}</h3>
          {onMore && <span onClick={e => e.stopPropagation()}><IconButton icon="ellipsis" size={28} label="Mais opções" onClick={onMore} /></span>}
        </div>
        {attrs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2) var(--space-10)' }}>
            {attrs.map(a => (
              <div key={a.label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-0-5)' }}>
                <span style={{ fontSize: 'var(--fs-p5-5)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{a.label}:</span>
                <span style={{ fontSize: 'var(--fs-p4-5)', fontWeight: 'var(--fw-medium)' }}>{a.value}</span>
              </div>
            ))}
          </div>
        )}
        {features.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {featuresLabel && <span style={{ fontSize: 'var(--fs-p5-5)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{featuresLabel}:</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(var(--control-w-sm),1fr))', gap: 'var(--space-2) var(--space-5)' }}>
              {features.map(f => <span key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-medium)' }}><Icon name={f.icon} size={20} />{f.label}</span>)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
