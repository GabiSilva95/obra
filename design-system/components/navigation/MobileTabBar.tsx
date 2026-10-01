import type { CSSProperties } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';

/** Bottom tab bar for < 900px — mirrors the sidebar's top 4–5 destinations. */
export interface MobileTabBarProps { items?: { id: string; label: string; icon: IconName }[]; activeId?: string; onSelect?: (id: string) => void; style?: CSSProperties; }

export function MobileTabBar({ items = [], activeId, onSelect, style }: MobileTabBarProps) {
  return (
    <nav style={{ height: 'var(--mobile-tabbar-height)', display: 'flex', alignItems: 'stretch', background: 'var(--surface-tabbar)', borderRadius: 'var(--radius-tabbar) var(--radius-tabbar) 0 0', padding: 'var(--space-1-5) var(--space-2) calc(var(--space-1-5) + env(safe-area-inset-bottom))', ...style }}>
      {items.map(it => {
        const on = it.id === activeId;
        return (
          <button key={it.id} type="button" onClick={() => onSelect?.(it.id)} aria-label={it.label} aria-current={on ? 'page' : undefined}
            style={{ flex: 1, minWidth: 'var(--space-11)', border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-0-5)', cursor: 'pointer', color: on ? 'var(--accent)' : 'var(--text-on-sidebar-muted)', font: 'inherit', fontSize: 'var(--fs-micro)', fontWeight: on ? 700 : 500 }}>
            <span style={{ width: 'var(--space-11)', height: 'var(--space-7)', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--text-on-accent)' : 'inherit', boxShadow: on ? 'var(--shadow-nav-glow)' : 'none' }}>
              <Icon name={it.icon} size={20} />
            </span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
