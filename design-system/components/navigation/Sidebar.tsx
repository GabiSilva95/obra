import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';

export interface NavItemDef {
  id: string;
  label: string;
  /** Icon name */
  icon?: IconName;
  /** Count bubble */
  badge?: number;
  /** Sub-items; parent expands with a chevron */
  children?: NavItemDef[];
}

/** Dark, rounded app sidebar with glowing orange active pill; expands, collapses to icons, or acts as a mobile drawer. */
export interface SidebarProps {
  items?: NavItemDef[];
  /** Pinned to bottom: language, settings, log out */
  footerItems?: NavItemDef[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Icon-only 88px rail */
  collapsed?: boolean;
  onToggle?: () => void;
  /** Drawer mode: shows ✕ instead of collapse */
  onClose?: () => void;
  /** Path to assets/logo-negativo.svg */
  logoSrc?: string;
  /** Text wordmark used when there is no logoSrc */
  brand?: ReactNode;
  /** Text shown in collapsed rail (no icon mark exists), default "CP" */
  compactLabel?: string;
  /** Free slot above footerItems (e.g. user / tenant block); hidden when collapsed */
  footer?: ReactNode;
  height?: number | string;
  style?: CSSProperties;
}

interface NavItemProps { item: NavItemDef; active?: boolean; collapsed?: boolean; depth?: number; onSelect?: (id: string) => void; activeId?: string; }

function NavItem({ item, active, collapsed, depth = 0, onSelect, activeId }: NavItemProps) {
  const [open, setOpen] = useState(!!item.children?.some(c => c.id === activeId));
  const [h, setH] = useState(false);
  const has = !!item.children?.length && !collapsed;
  const isActive = active || (collapsed && !!item.children?.some(c => c.id === activeId));
  const activate = () => { if (has) setOpen(!open); else onSelect?.(item.id); };
  return (
    <div>
      <div role="button" tabIndex={0} aria-current={isActive ? 'page' : undefined} aria-expanded={has ? open : undefined}
        title={collapsed ? item.label : undefined} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        onClick={activate} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: depth ? 'var(--space-9-5)' : 'var(--space-11)', padding: collapsed ? 0 : `0 calc(var(--space-3) + ${depth} * var(--space-5))`,
          justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 'var(--radius-md)', cursor: 'pointer',
          background: isActive ? 'var(--accent)' : h ? 'var(--surface-sidebar-hover)' : 'transparent',
          color: isActive ? 'var(--text-on-accent)' : depth ? 'var(--text-on-sidebar-muted)' : 'var(--text-on-sidebar)',
          boxShadow: isActive ? 'var(--shadow-nav-glow)' : 'none', fontSize: depth ? 'var(--fs-p5-5)' : 'var(--fs-p5)', fontWeight: isActive ? 'var(--fw-bold)' : 'var(--fw-medium)',
          transition: 'background var(--dur-fast)', width: collapsed ? 'var(--space-11)' : 'auto', margin: collapsed ? '0 auto' : 0,
        }}>
        {item.icon && <Icon name={item.icon} size={20} />}
        {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
        {!collapsed && item.badge ? (
          <span style={{
            minWidth: 'var(--space-5)', height: 'var(--space-5)', borderRadius: 'var(--radius-pill)', background: isActive ? 'var(--surface-sidebar)' : 'var(--accent)',
            color: isActive ? 'var(--text-on-sidebar)' : 'var(--text-on-accent)', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-extrabold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 var(--space-1-5)',
          }}>{item.badge}</span>
        ) : null}
        {has && <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} />}
      </div>
      {has && open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-0-5)', marginTop: 'var(--space-0-5)' }}>
          {item.children!.map(c => <NavItem key={c.id} item={c} depth={depth + 1} active={c.id === activeId} activeId={activeId} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ items = [], footerItems = [], activeId, onSelect, collapsed, onToggle, onClose, logoSrc, brand = 'ConstruktPro', compactLabel = 'CP', footer, height = '100%', style }: SidebarProps) {
  return (
    <nav style={{
      width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)', height, flexShrink: 0, background: 'var(--surface-sidebar)',
      borderRadius: 'var(--radius-lg)', padding: collapsed ? 'var(--space-6) var(--space-3)' : 'var(--space-6) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
      transition: 'width var(--dur-slow) var(--ease-standard)', overflow: 'hidden', color: 'var(--text-on-sidebar)', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', flexDirection: collapsed ? 'column' : 'row', gap: 'var(--space-3)', padding: collapsed ? 0 : '0 var(--space-1) 0 var(--space-3)', marginBottom: 'var(--space-6)', minHeight: 'var(--space-10)' }}>
        {collapsed
          ? <span style={{ fontWeight: 'var(--fw-black)', fontSize: 'var(--fs-p3)', letterSpacing: 'var(--ls-tight)', color: 'var(--text-on-sidebar)' }}>{compactLabel.slice(0, -1)}<span style={{ color: 'var(--accent)' }}>{compactLabel.slice(-1)}</span></span>
          : logoSrc ? <img src={logoSrc} alt={typeof brand === 'string' ? brand : ''} style={{ height: 'var(--space-9)', width: 'auto', maxWidth: 'var(--logo-w-sm)' }} />
          : <span style={{ fontWeight: 'var(--fw-black)', fontSize: 'var(--fs-p2)', color: 'var(--text-on-sidebar)', minWidth: 0 }}>{brand}</span>}
        {(onToggle || onClose) && (
          <button type="button" aria-label={onClose ? 'Fechar menu' : collapsed ? 'Expandir' : 'Recolher'} onClick={onClose || onToggle}
            style={{ width: 'var(--space-8)', height: 'var(--space-8)', border: 0, background: 'transparent', color: 'var(--text-on-sidebar)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={onClose ? 'x' : collapsed ? 'panel-left-open' : 'panel-left-close'} size={20} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', padding: 'var(--space-1) var(--space-1-5)', margin: 'calc(-1 * var(--space-1)) calc(-1 * var(--space-1-5))' }}>
        {items.map(it => <NavItem key={it.id} item={it} collapsed={collapsed} active={it.id === activeId} activeId={activeId} onSelect={onSelect} />)}
      </div>
      {footer && !collapsed && <div style={{ paddingTop: 'var(--space-3)' }}>{footer}</div>}
      {footerItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', paddingTop: 'var(--space-3)' }}>
          {footerItems.map(it => <NavItem key={it.id} item={it} collapsed={collapsed} active={it.id === activeId} activeId={activeId} onSelect={onSelect} />)}
        </div>
      )}
    </nav>
  );
}
