function HomeScreen({ mobile, narrow, go }) {
  const { StatCard, Card, AreaChart, BarChart, MiniCalendar, MessageItem, FilterPill, Button } = window.DS;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: mobile || narrow ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: mobile ? 12 : 24 }}>
      <StatCard value="24" label="Obras ativas" color="var(--stat-1)" />
      <StatCard value="103" label="Entregas na semana" color="var(--stat-2)" />
      <StatCard value="86" label="Equipes em campo" color="var(--stat-3)" />
      <StatCard value="R$ 342k" label="Receita do mês" color="var(--stat-4)" />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: mobile || narrow ? 'minmax(0,1fr)' : 'minmax(0,2fr) minmax(300px,1fr)', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        <Card title="Receita" action={<FilterPill options={['Últimos 6 meses', 'Último ano', 'Este mês']} />}>
          <AreaChart height={mobile ? 160 : 220} data={[180, 240, 150, 420, 300, 240, 380, 460]} labels={mobile ? ['Abr', 'Jun', 'Ago', 'Nov'] : ['Abr 2025', 'Mai 2025', 'Jun 2025', 'Jul 2025', 'Ago 2025', 'Set 2025', 'Out 2025', 'Nov 2025']} max={500} highlight={3} format={v => 'R$' + v + 'k'} />
        </Card>
        <Card title="Medições" action={<FilterPill options={['Última semana', 'Último mês']} />}>
          <BarChart height={180} max={250} series={[{ key: 'a', label: 'Previsto', color: 'var(--accent)' }, { key: 'b', label: 'Realizado', color: 'var(--cp-black)' }]}
            data={[{ label: '29 out', a: 220, b: 120 }, { label: '30 out', a: 170, b: 60 }, { label: '31 out', a: 200, b: 110 }, { label: '1 nov', a: 150, b: 70 }, { label: '2 nov', a: 190, b: 90 }, { label: '3 nov', a: 140, b: 40 }, { label: '4 nov', a: 160, b: 70 }].slice(0, mobile ? 5 : 7)} />
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        <Card><MiniCalendar year={2025} month={10} today={12} marked={[13, 16, 17, 19, 26]} alert={[20]} onSelect={() => go('cronograma')} /></Card>
        <Card title="Mensagens recentes" action={<Button variant="link" size="sm" onClick={() => go('mensagens')}>Ver tudo</Button>} padding={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '-8px -4px 0' }}>{MSGS.map(m => <MessageItem key={m.id} {...m} onClick={() => go('mensagens')} />)}</div>
        </Card>
      </div>
    </div>
  </div>;
}
window.HomeScreen = HomeScreen;
