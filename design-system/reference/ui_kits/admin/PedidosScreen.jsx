function PedidosScreen({ mobile }) {
  const { DataTable, Badge, Tag, IconButton, SegmentedTabs, Button } = window.DS;
  const [f, setF] = React.useState('Todos');
  const rows = PEDIDOS.filter(p => f === 'Todos' || (f === 'Pendentes' ? ['Pendente', 'Novo pedido'].includes(p.status) : f === 'Pagos' ? p.status.startsWith('Pago') : p.status === 'Em trânsito'));
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <SegmentedTabs variant="light" value={f} onChange={setF} tabs={[{ value: 'Todos', label: 'Todos', count: PEDIDOS.length }, { value: 'Pendentes', label: 'Pendentes' }, { value: 'Em trânsito', label: 'Em trânsito' }, { value: 'Pagos', label: 'Pagos' }]} />
      <div style={{ display: 'flex', gap: 8 }}><IconButton icon="sliders-horizontal" variant="outline" label="Filtros" /><Button iconLeft="plus">Novo pedido</Button></div>
    </div>
    {mobile ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{rows.map(p => <div key={p.id} style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 700 }}>{p.id}</span><Badge size="sm" tone={STATUS[p.status]}>{p.status}</Badge></div>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{p.item}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.fornecedor} · {p.obra}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Tag>{p.cat}</Tag><span style={{ fontWeight: 700 }}>{p.valor}</span></div>
      </div>)}</div>
    : <DataTable rows={rows} rowKey={r => r.id} minWidth={980} columns={[
      { key: 'fornecedor', label: 'Fornecedor', render: r => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{r.fornecedor}</span><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.contato}</span></div> },
      { key: 'id', label: 'Pedido' }, { key: 'obra', label: 'Obra' }, { key: 'item', label: 'Item' },
      { key: 'cat', label: 'Categoria', render: r => <Tag>{r.cat}</Tag> }, { key: 'data', label: 'Data' }, { key: 'valor', label: 'Valor', align: 'right' },
      { key: 'status', label: 'Status', render: r => <Badge size="sm" tone={STATUS[r.status]}>{r.status}</Badge> },
      { key: 'acoes', label: '', render: () => <div style={{ display: 'flex', gap: 4 }}><IconButton icon="pencil" size={28} label="Editar" /><IconButton icon="trash-2" variant="danger" size={28} label="Excluir" /></div> }]} />}
  </div>;
}
window.PedidosScreen = PedidosScreen;
