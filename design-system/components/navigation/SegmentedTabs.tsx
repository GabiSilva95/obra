import { useState } from 'react';

export type SegmentedTab = string | { value: string; label: string; count?: number };

/** Segmented control: dark bar with orange active segment, or light variant. */
export interface SegmentedTabsProps {
  tabs?: SegmentedTab[];
  value?: string; defaultValue?: string; onChange?: (value: string) => void;
  variant?: 'dark' | 'light';
  fullWidth?: boolean;
}

export function SegmentedTabs({ tabs = [], value, defaultValue, onChange, variant = 'dark', fullWidth }: SegmentedTabsProps) {
  const first = tabs[0];
  const [inner, setInner] = useState(defaultValue ?? (first === undefined ? undefined : typeof first === 'string' ? first : first.value));
  const v = value ?? inner;
  const dark = variant === 'dark';
  return (
    <div role="tablist" style={{ display: fullWidth ? 'flex' : 'inline-flex', gap: 'var(--space-1)', padding: 'var(--space-1)', background: dark ? 'var(--surface-segmented)' : 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', maxWidth: '100%' }}>
      {tabs.map(t => {
        const val = typeof t === 'string' ? t : t.value;
        const lab = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'string' ? undefined : t.count;
        const on = val === v;
        return (
          <button key={val} type="button" role="tab" aria-selected={on} onClick={() => { setInner(val); onChange?.(val); }}
            style={{
              flex: fullWidth ? 1 : '0 0 auto', height: 'var(--control-h-sm)', padding: '0 var(--space-4-5)', border: 0, borderRadius: 'var(--radius-sm-inner)', cursor: 'pointer',
              font: 'inherit', fontSize: 'var(--fs-p5-5)', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
              background: on ? (dark ? 'var(--accent)' : 'var(--surface-card)') : 'transparent',
              color: on ? (dark ? 'var(--text-on-accent)' : 'var(--text-primary)') : dark ? 'var(--text-on-sidebar)' : 'var(--text-secondary)',
              boxShadow: on && !dark ? 'var(--shadow-card)' : 'none', transition: 'background var(--dur-fast)',
            }}>
            {lab}{count != null && <span style={{ marginLeft: 'var(--space-1-5)', fontSize: 'var(--fs-caption)', opacity: 0.8 }}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
