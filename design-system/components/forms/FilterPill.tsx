import { useState } from 'react';
import { Icon } from '../core/Icon';

/** Compact outline pill dropdown for chart periods ("Últimos 6 meses"). */
export interface FilterPillProps { options?: string[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; label?: string; }

export function FilterPill({ options = [], value, defaultValue, onChange, label = 'Período' }: FilterPillProps) {
  const [inner, setInner] = useState(defaultValue ?? options[0]);
  const v = value ?? inner;
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1-5)', height: 'var(--control-h-sm)', padding: '0 var(--space-3) 0 var(--space-3-5)',
      border: 'var(--border-w) solid var(--border-default)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-control)',
      color: 'var(--text-secondary)', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)',
    }}>
      {v}<Icon name="chevron-down" size={14} />
      <select aria-label={label} value={v} onChange={e => { setInner(e.target.value); onChange?.(e.target.value); }}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </span>
  );
}
