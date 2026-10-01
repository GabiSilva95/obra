import type { ReactNode } from 'react';

/** Chat message bubble — neutral incoming, orange outgoing. */
export interface ChatBubbleProps { text: ReactNode; time?: string; mine?: boolean; }

export function ChatBubble({ text, time, mine }: ChatBubbleProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 'var(--space-1)' }}>
      <div style={{ maxWidth: 'min(var(--content-w-xs), 80%)', padding: 'var(--space-2-5) var(--space-3-5)', fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-medium)', lineHeight: 'var(--lh-body)', borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: mine ? 'var(--accent)' : 'var(--surface-sunken)', color: mine ? 'var(--text-on-accent)' : 'var(--text-primary)' }}>{text}</div>
      {time && <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-semibold)' }}>{time}</span>}
    </div>
  );
}
