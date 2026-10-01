function CronogramaScreen({ mobile, narrow }) {
  const { MonthCalendar, Card, Button, Textarea } = window.DS;
  const [notes, setNotes] = React.useState([{ who: 'Carlos Mendes', txt: 'Concretagem do bloco B depende de liberação da vistoria. Confirmar com engenheiro responsável.' }, { who: 'Ana Ribeiro', txt: 'Entrega de vergalhões precisa de guindaste no portão 2.' }]);
  const [adding, setAdding] = React.useState(false); const [draft, setDraft] = React.useState('');
  const events = [{ start: 3, end: 5, title: 'Fundação · Rota 101', sub: 'Equipe 3', color: 'var(--cp-data-pink)' }, { start: 13, end: 16, title: 'Concretagem', sub: 'Vila Nova · Bloco B', color: 'var(--cp-data-purple)' }, { start: 19, end: 22, title: 'Entrega de aço', sub: 'Ed. Aurora', color: 'var(--cp-data-yellow)', textColor: 'var(--cp-black)' }, { start: 25, end: 27, title: 'Vistoria', sub: 'Prefeitura', color: 'var(--cp-data-turquoise)', textColor: 'var(--cp-black)' }];
  return <div style={{ display: 'grid', gridTemplateColumns: mobile || narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 300px', gap: 24, alignItems: 'start' }}>
    <MonthCalendar year={2025} month={10} today={1} events={events} compact={mobile} />
    <Card title="Anotações" padding={16}>
      {notes.map((n, i) => <div key={i} style={{ background: 'var(--cp-gray-50)', borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 6 }}><b style={{ fontSize: 13 }}>{n.who}</b><span><b>Nota:</b> {n.txt}</span></div>)}
      {adding && <Textarea placeholder="Escreva a anotação" rows={3} maxLength={300} value={draft} onChange={e => setDraft(e.target.value)} />}
      <Button fullWidth size="sm" iconLeft={adding ? 'check' : 'plus'} onClick={() => { if (adding && draft.trim()) { setNotes([...notes, { who: USER.name, txt: draft }]); setDraft(''); } setAdding(!adding); }}>{adding ? 'Salvar anotação' : 'Nova anotação'}</Button>
    </Card>
  </div>;
}
window.CronogramaScreen = CronogramaScreen;
