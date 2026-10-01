import { Icon } from '../core/Icon';
import { Photo } from './Photo';

/** Square catalogue tile: image, name + price, full-width dark "Editar" button. */
export interface ProductCardProps { image?: string; title: string; price?: string; onEdit?: () => void; editLabel?: string; }

export function ProductCard({ image, title, price, onEdit, editLabel = 'Editar' }: ProductCardProps) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)', padding: 'var(--space-2)', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)', minWidth: 0 }}>
      <div style={{ aspectRatio: '1 / 1', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}><Photo src={image} alt={title} style={{ objectFit: 'contain' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', padding: '0 var(--space-1)', fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ whiteSpace: 'nowrap' }}>{price}</span>
      </div>
      <button type="button" onClick={onEdit} style={{ height: 'var(--control-h-sm)', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--action-primary-bg)', color: 'var(--action-primary-fg)', font: 'inherit', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1-5)', cursor: 'pointer' }}>
        <Icon name="pencil" size={14} />{editLabel}
      </button>
    </article>
  );
}
