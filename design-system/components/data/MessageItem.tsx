import { useState } from 'react';
import { Avatar } from '../core/Avatar';

/** Conversation row: avatar, name, one-line preview, time and unread count. */
export interface MessageItemProps { name: string; preview?: string; time?: string; unread?: number; active?: boolean; avatar?: string; online?: boolean; onClick?: () => void; }

export function MessageItem({ name, preview, time, unread, active, avatar, online, onClick }: MessageItemProps) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} role="button" tabIndex={0} aria-current={active ? 'true' : undefined} onKeyDown={e => { if (e.key === 'Enter') onClick?.(); }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2-5) var(--space-3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: active ? 'var(--surface-selected)' : h ? 'var(--surface-hover-subtle)' : 'transparent', boxShadow: active ? 'inset 3px 0 0 var(--accent)' : 'none', minWidth: 0 }}>
      <Avatar name={name} src={avatar} size={40} online={online} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-0-5)' }}>
        <span style={{ fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        <span style={{ fontSize: 'var(--fs-p6)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
        {time && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{time}</span>}
        {unread ? <span style={{ minWidth: 'var(--space-4-5)', height: 'var(--space-4-5)', borderRadius: 'var(--radius-pill)', background: 'var(--accent)', color: 'var(--text-on-accent)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-extrabold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span> : null}
      </div>
    </div>
  );
}
