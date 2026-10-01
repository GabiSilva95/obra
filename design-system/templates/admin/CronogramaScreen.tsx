import { useState } from 'react';
import { Button, Card, MonthCalendar, Textarea, type CalendarEvent } from '../../index';
import { USER, type ScreenProps } from './data';

const EVENTS: CalendarEvent[] = [
  { start: 3, end: 5, title: 'Fundação · Rota 101', sub: 'Equipe 3', color: 'var(--cp-data-pink)' },
  { start: 13, end: 16, title: 'Concretagem', sub: 'Vila Nova · Bloco B', color: 'var(--cp-data-purple)' },
  { start: 19, end: 22, title: 'Entrega de aço', sub: 'Ed. Aurora', color: 'var(--cp-data-yellow)', textColor: 'var(--text-on-bright)' },
  { start: 25, end: 27, title: 'Vistoria', sub: 'Prefeitura', color: 'var(--cp-data-turquoise)', textColor: 'var(--text-on-bright)' },
];

/** Schedule page: month grid + side notes panel with inline add. */
export function CronogramaScreen({ mobile, narrow }: ScreenProps) {
  const [notes, setNotes] = useState([
    { who: 'Carlos Mendes', txt: 'Concretagem do bloco B depende de liberação da vistoria. Confirmar com engenheiro responsável.' },
    { who: 'Ana Ribeiro', txt: 'Entrega de vergalhões precisa de guindaste no portão 2.' },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: mobile || narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 300px', gap: 'var(--space-6)', alignItems: 'start' }}>
      <MonthCalendar year={2025} month={10} today={1} events={EVENTS} compact={mobile} />
      <Card title="Anotações" padding={16}>
        {notes.map((n, i) => (
          <div key={i} style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--fs-p6)', lineHeight: 'var(--lh-body)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1-5)' }}>
            <b style={{ fontSize: 'var(--fs-p5-5)' }}>{n.who}</b><span><b>Nota:</b> {n.txt}</span>
          </div>
        ))}
        {adding && <Textarea placeholder="Escreva a anotação" rows={3} maxLength={300} value={draft} onChange={e => setDraft(e.target.value)} />}
        <Button fullWidth size="sm" iconLeft={adding ? 'check' : 'plus'}
          onClick={() => { if (adding && draft.trim()) { setNotes([...notes, { who: USER.name, txt: draft }]); setDraft(''); } setAdding(!adding); }}>
          {adding ? 'Salvar anotação' : 'Nova anotação'}
        </Button>
      </Card>
    </div>
  );
}
