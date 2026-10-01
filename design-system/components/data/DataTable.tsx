import { useState, type ReactNode } from 'react';

export interface ColumnDef<Row = any> { key: string; label: string; width?: number | string; align?: 'left' | 'center' | 'right'; render?: (row: Row) => ReactNode; }

/** Table with the signature solid header row; scrolls horizontally on small screens. */
export interface DataTableProps<Row = any> {
  columns?: ColumnDef<Row>[];
  rows?: Row[];
  rowKey?: (row: Row, i: number) => string | number;
  onRowClick?: (row: Row) => void;
  /** Below this width it scrolls, default 720 */
  minWidth?: number;
  dense?: boolean;
  /** Shown in place of the body when there are no rows */
  empty?: ReactNode;
}

export function DataTable<Row = any>({ columns = [], rows = [], rowKey = (_r, i) => i, onRowClick, minWidth = 720, dense, empty = 'Nenhum registro.' }: DataTableProps<Row>) {
  const [hov, setHov] = useState(-1);
  return (
    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)' }}>
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontSize: 'var(--fs-p5-5)' }}>
        <thead>
          <tr>{columns.map(c => (
            <th key={c.key} style={{ background: 'var(--surface-table-header)', color: 'var(--text-on-sidebar)', textAlign: c.align || 'left', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-p5-5)', padding: 'var(--space-3-5) var(--space-4)', whiteSpace: 'nowrap', width: c.width }}>{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length || 1} style={{ padding: 'var(--space-10) var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)' }}>{empty}</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)} onClick={() => onRowClick?.(r)}
              style={{ background: hov === i ? 'var(--surface-row-hover)' : 'transparent', cursor: onRowClick ? 'pointer' : 'default', transition: 'background var(--dur-fast)' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: dense ? 'var(--space-2-5) var(--space-4)' : 'var(--space-3-5) var(--space-4)', borderBottom: 'var(--border-w) solid var(--border-subtle)', textAlign: c.align || 'left', fontWeight: 'var(--fw-medium)', verticalAlign: 'middle' }}>
                  {c.render ? c.render(r) : (r as Record<string, ReactNode>)[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
