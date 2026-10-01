import { AreaChart, BarChart, Button, Card, FilterPill, MessageItem, MiniCalendar, StatCard } from '../../index';
import { MSGS, type ScreenProps } from './data';

/** Dashboard: 4 KPI tiles → 2/3 charts column + 1/3 calendar/messages column. */
export function HomeScreen({ mobile, narrow, go }: ScreenProps) {
  const oneCol = mobile || narrow;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: oneCol ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: mobile ? 'var(--space-3)' : 'var(--space-6)' }}>
        <StatCard value="24" label="Obras ativas" color="var(--stat-1)" />
        <StatCard value="103" label="Entregas na semana" color="var(--stat-2)" />
        <StatCard value="86" label="Equipes em campo" color="var(--stat-3)" />
        <StatCard value="R$ 342k" label="Receita do mês" color="var(--stat-4)" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: oneCol ? 'minmax(0,1fr)' : 'minmax(0,2fr) minmax(300px,1fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
          <Card title="Receita" action={<FilterPill options={['Últimos 6 meses', 'Último ano', 'Este mês']} />}>
            <AreaChart height={mobile ? 160 : 220} data={[180, 240, 150, 420, 300, 240, 380, 460]}
              labels={mobile ? ['Abr', 'Jun', 'Ago', 'Nov'] : ['Abr 2025', 'Mai 2025', 'Jun 2025', 'Jul 2025', 'Ago 2025', 'Set 2025', 'Out 2025', 'Nov 2025']}
              max={500} highlight={3} format={v => 'R$' + v + 'k'} />
          </Card>
          <Card title="Medições" action={<FilterPill options={['Última semana', 'Último mês']} />}>
            <BarChart height={180} max={250} series={[{ key: 'a', label: 'Previsto', color: 'var(--accent)' }, { key: 'b', label: 'Realizado', color: 'var(--text-primary)' }]}
              data={[{ label: '29 out', a: 220, b: 120 }, { label: '30 out', a: 170, b: 60 }, { label: '31 out', a: 200, b: 110 }, { label: '1 nov', a: 150, b: 70 }, { label: '2 nov', a: 190, b: 90 }, { label: '3 nov', a: 140, b: 40 }, { label: '4 nov', a: 160, b: 70 }].slice(0, mobile ? 5 : 7)} />
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 }}>
          <Card><MiniCalendar year={2025} month={10} today={12} marked={[13, 16, 17, 19, 26]} alert={[20]} onSelect={() => go('cronograma')} /></Card>
          <Card title="Mensagens recentes" action={<Button variant="link" size="sm" onClick={() => go('mensagens')}>Ver tudo</Button>} padding={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-0-5)', margin: 'calc(-1 * var(--space-2)) calc(-1 * var(--space-1)) 0' }}>
              {MSGS.map(m => <MessageItem key={m.id} {...m} onClick={() => go('mensagens')} />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
