function MensagensScreen({ mobile, narrow }) {
  const { MessageItem, ChatBubble, Avatar, Icon, IconButton, SegmentedTabs } = window.DS;
  const [sel, setSel] = React.useState(mobile ? null : 1);
  const [thread, setThread] = React.useState([{ t: 'Bom dia! O concreto usinado chega amanhã às 7h?', m: false, time: 'Qui 11:40' }, { t: 'Bom dia, Carlos. Sim, confirmado com a usina — 3 caminhões.', m: true, time: 'Qui 11:45' }, { t: 'Perfeito. A bomba já está reservada?', m: false, time: 'Qui 11:46' }]);
  const [draft, setDraft] = React.useState('');
  const send = () => { if (!draft.trim()) return; setThread([...thread, { t: draft, m: true, time: 'Agora' }]); setDraft(''); };
  const cur = MSGS.find(m => m.id === sel);
  const list = <div style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', background: 'var(--cp-gray-100)', borderRadius: 8, color: 'var(--text-secondary)' }}><Icon name="search" size={16} /><input placeholder="Buscar conversas" style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 13, flex: 1 }} /></div>
    <SegmentedTabs variant="light" fullWidth tabs={[{ value: 'all', label: 'Todas', count: 4 }, { value: 'f', label: 'Fornecedores' }, { value: 'c', label: 'Clientes' }]} />
    {MSGS.map(m => <MessageItem key={m.id} {...m} active={m.id === sel} onClick={() => setSel(m.id)} />)}
  </div>;
  const chat = cur && <div style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', minHeight: mobile ? 'calc(100vh - 220px)' : 560, minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: '1px solid var(--border-subtle)' }}>
      {mobile && <IconButton icon="arrow-left" label="Voltar" onClick={() => setSel(null)} />}
      <Avatar name={cur.name} online={cur.online} /><div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}><b style={{ fontSize: 15 }}>{cur.name}</b><span style={{ fontSize: 11, color: 'var(--cp-success-strong)', fontWeight: 600 }}>{cur.online ? '● Online' : 'Visto por último ontem'}</span></div>
      <IconButton icon="phone" label="Ligar" /><IconButton icon="ellipsis" label="Mais" />
    </div>
    <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>{thread.map((b, i) => <ChatBubble key={i} text={b.t} mine={b.m} time={b.time} />)}</div>
    <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
      <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escreva uma mensagem" style={{ flex: 1, height: 44, border: '1px solid var(--border-default)', borderRadius: 8, padding: '0 14px', font: 'inherit', fontSize: 14, outline: 0 }} />
      <IconButton icon="send" variant="dark" size={44} label="Enviar" onClick={send} />
    </div>
  </div>;
  if (mobile) return sel ? chat : list;
  return <div style={{ display: 'grid', gridTemplateColumns: narrow ? '280px minmax(0,1fr)' : '340px minmax(0,1fr)', gap: 24, alignItems: 'start' }}>{list}{chat}</div>;
}
window.MensagensScreen = MensagensScreen;
