import { useState } from 'react';
import { Avatar, ChatBubble, Icon, IconButton, MessageItem, SegmentedTabs } from '../../index';
import { MSGS, type ScreenProps } from './data';

const panel = { background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)' } as const;

/** Inbox + chat: list/detail side by side on desktop, stacked navigation on mobile. */
export function MensagensScreen({ mobile, narrow }: ScreenProps) {
  const [sel, setSel] = useState<number | null>(mobile ? null : 1);
  const [thread, setThread] = useState([
    { t: 'Bom dia! O concreto usinado chega amanhã às 7h?', m: false, time: 'Qui 11:40' },
    { t: 'Bom dia, Carlos. Sim, confirmado com a usina: 3 caminhões.', m: true, time: 'Qui 11:45' },
    { t: 'Perfeito. A bomba já está reservada?', m: false, time: 'Qui 11:46' },
  ]);
  const [draft, setDraft] = useState('');
  const send = () => { if (!draft.trim()) return; setThread([...thread, { t: draft, m: true, time: 'Agora' }]); setDraft(''); };
  const cur = MSGS.find(m => m.id === sel);

  const list = (
    <div style={{ ...panel, padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', height: 'var(--control-h-md)', padding: '0 var(--space-3)', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
        <Icon name="search" size={16} />
        <input placeholder="Buscar conversas" aria-label="Buscar conversas" style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 'var(--fs-p5-5)', flex: 1, color: 'var(--text-primary)' }} />
      </div>
      <SegmentedTabs variant="light" fullWidth tabs={[{ value: 'all', label: 'Todas', count: 4 }, { value: 'f', label: 'Fornecedores' }, { value: 'c', label: 'Clientes' }]} />
      {MSGS.map(m => <MessageItem key={m.id} {...m} active={m.id === sel} onClick={() => setSel(m.id)} />)}
    </div>
  );

  const chat = cur && (
    <div style={{ ...panel, display: 'flex', flexDirection: 'column', minHeight: mobile ? 'calc(100vh - 220px)' : 560, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: 'var(--border-w) solid var(--border-subtle)' }}>
        {mobile && <IconButton icon="arrow-left" label="Voltar" onClick={() => setSel(null)} />}
        <Avatar name={cur.name} online={cur.online} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <b style={{ fontSize: 'var(--fs-p4-5)' }}>{cur.name}</b>
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--status-success)', fontWeight: 'var(--fw-semibold)' }}>{cur.online ? '● Online' : 'Visto por último ontem'}</span>
        </div>
        <IconButton icon="phone" label="Ligar" /><IconButton icon="ellipsis" label="Mais" />
      </div>
      <div style={{ flex: 1, padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflowY: 'auto' }}>
        {thread.map((b, i) => <ChatBubble key={i} text={b.t} mine={b.m} time={b.time} />)}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3)', borderTop: 'var(--border-w) solid var(--border-subtle)' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Escreva uma mensagem" aria-label="Mensagem"
          style={{ flex: 1, height: 'var(--space-11)', border: 'var(--border-w) solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0 var(--space-3-5)', font: 'inherit', fontSize: 'var(--fs-p5)', outline: 0, background: 'var(--surface-control)', color: 'var(--text-primary)' }} />
        <IconButton icon="send" variant="dark" size={44} label="Enviar" onClick={send} />
      </div>
    </div>
  );

  if (mobile) return sel ? chat : list;
  return <div style={{ display: 'grid', gridTemplateColumns: narrow ? '280px minmax(0,1fr)' : '340px minmax(0,1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>{list}{chat}</div>;
}
