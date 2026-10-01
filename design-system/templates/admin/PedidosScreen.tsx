import { useState } from 'react';
import { Badge, Button, DataTable, IconButton, SegmentedTabs, Tag } from '../../index';
import { PEDIDOS, STATUS, type Pedido, type ScreenProps } from './data';

/** Records page: filter tabs + actions, DataTable on desktop, card list on mobile. */
export function PedidosScreen({ mobile }: ScreenProps) {
  const [f, setF] = useState('Todos');
  const rows = PEDIDOS.filter(p => f === 'Todos' || (f === 'Pendentes' ? ['Pendente', 'Novo pedido'].includes(p.status) : f === 'Pagos' ? p.status.startsWith('Pago') : p.status === 'Em trânsito'));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <SegmentedTabs variant="light" value={f} onChange={setF} tabs={[{ value: 'Todos', label: 'Todos', count: PEDIDOS.length }, { value: 'Pendentes', label: 'Pendentes' }, { value: 'Em trânsito', label: 'Em trânsito' }, { value: 'Pagos', label: 'Pagos' }]} />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}><IconButton icon="sliders-horizontal" variant="outline" label="Filtros" /><Button iconLeft="plus">Novo pedido</Button></div>
      </div>
      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map(p => (
            <div key={p.id} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 'var(--fw-bold)' }}>{p.id}</span><Badge size="sm" tone={STATUS[p.status]}>{p.status}</Badge></div>
              <span style={{ fontSize: 'var(--fs-p4-5)', fontWeight: 'var(--fw-semibold)' }}>{p.item}</span>
              <span style={{ fontSize: 'var(--fs-p5-5)', color: 'var(--text-secondary)' }}>{p.fornecedor} · {p.obra}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Tag>{p.cat}</Tag><span style={{ fontWeight: 'var(--fw-bold)' }}>{p.valor}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable<Pedido> rows={rows} rowKey={r => r.id} minWidth={980} empty="Nenhum pedido neste filtro." columns={[
          { key: 'fornecedor', label: 'Fornecedor', render: r => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 'var(--fw-semibold)' }}>{r.fornecedor}</span><span style={{ fontSize: 'var(--fs-p6)', color: 'var(--text-secondary)' }}>{r.contato}</span></div> },
          { key: 'id', label: 'Pedido' }, { key: 'obra', label: 'Obra' }, { key: 'item', label: 'Item' },
          { key: 'cat', label: 'Categoria', render: r => <Tag>{r.cat}</Tag> }, { key: 'data', label: 'Data' }, { key: 'valor', label: 'Valor', align: 'right' },
          { key: 'status', label: 'Status', render: r => <Badge size="sm" tone={STATUS[r.status]}>{r.status}</Badge> },
          { key: 'acoes', label: '', render: () => <div style={{ display: 'flex', gap: 'var(--space-1)' }}><IconButton icon="pencil" size={28} label="Editar" /><IconButton icon="trash-2" variant="danger" size={28} label="Excluir" /></div> },
        ]} />
      )}
    </div>
  );
}
