import { useState, type CSSProperties, type ReactNode } from 'react';

/** Rounded panel with soft shadow; title row + optional action (FilterPill, "Ver tudo"). Clickable when `onClick` is set. */
export interface CardProps {
  title?: ReactNode;
  /** Node before the title, e.g. an icon tile */
  icon?: ReactNode;
  action?: ReactNode;
  padding?: number | string;
  /** Makes the whole card interactive (hover border, focusable) */
  onClick?: () => void;
  /** Selected state for pickable cards */
  selected?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Card({ title, icon, action, children, padding = 20, onClick, selected, style }: CardProps) {
  const [h, setH] = useState(false);
  const interactive = !!onClick;
  const highlight = selected || (interactive && h);
  return (
    <section onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} aria-pressed={interactive && selected !== undefined ? selected : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      style={{
        background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding, minWidth: 0,
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', border: 'var(--border-w) solid ' + (highlight ? 'var(--accent)' : 'var(--border-card)'),
        cursor: interactive ? 'pointer' : undefined, transition: 'border-color var(--dur-base)', ...style,
      }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, font: 'var(--type-card-title)', display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>{icon}{title}</h2>{action}
        </div>
      )}
      {children}
    </section>
  );
}
