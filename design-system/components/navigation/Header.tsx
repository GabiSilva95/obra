import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { Avatar } from '../core/Avatar';

/** Page header: title left, search/messages/notifications + user block right. */
export interface HeaderProps {
  title: string;
  user?: { name: string; role?: string; avatar?: string };
  /** 'icon' (default) · 'field' inline search bar · 'none' */
  search?: 'icon' | 'field' | 'none';
  /** Shows a hamburger (mobile) */
  onMenu?: () => void;
  /** Mobile: smaller title, hides user name */
  compact?: boolean;
  notifications?: number;
  /** Unread count, or false to hide the chat icon */
  messages?: number | false;
  actions?: ReactNode;
  /** Custom notifications control (e.g. bell with dropdown); replaces the default bell */
  notificationsSlot?: ReactNode;
  style?: CSSProperties;
}

export function Header({ title, user, search = 'icon', onMenu, compact, notifications, messages, actions, notificationsSlot, style }: HeaderProps) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 'var(--space-2)', gap: 'var(--space-3)', minHeight: 'var(--header-height)', padding: 'var(--space-3) 0', borderBottom: 'var(--border-w) solid var(--border-default)', ...style }}>
      {onMenu && <IconButton icon="menu" label="Abrir menu" onClick={onMenu} size={40} />}
      <h1 style={{ margin: 0, flex: search === 'field' && !compact ? '0 0 auto' : compact ? 1 : '1 0 auto', minWidth: compact ? 0 : undefined, font: 'var(--type-page-title)', fontSize: compact ? 22 : 28, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
      {search === 'field' && !compact && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 'var(--search-w)', height: 'var(--control-h-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 var(--space-3-5)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
            <Icon name="search" size={16} />
            <input placeholder="Buscar" aria-label="Buscar" style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 'var(--fs-p5-5)', flex: 1, color: 'var(--text-primary)' }} />
          </div>
        </div>
      )}
      {actions}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        {search === 'icon' && <IconButton icon="search" label="Buscar" />}
        {messages !== false && <IconButton icon="message-circle" label="Mensagens" badge={messages || undefined} />}
        {notificationsSlot ?? <IconButton icon="bell" label="Notificações" badge={notifications || undefined} />}
      </div>
      {user && (
        <>
          <span style={{ width: 'var(--border-w)', height: 'var(--space-8)', background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)' }}>
            <Avatar src={user.avatar} name={user.name} size={40} />
            {!compact && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 'var(--lh-snug)' }}>
                <span style={{ fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-semibold)' }}>{user.name}</span>
                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{user.role}</span>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
