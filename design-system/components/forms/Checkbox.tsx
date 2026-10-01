import { useState, type ReactNode } from 'react';
import { Icon } from '../core/Icon';

/** Square checkbox, filled when checked. Controlled or uncontrolled. */
export interface CheckboxProps { checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; label?: ReactNode; disabled?: boolean; size?: number; }

export function Checkbox({ checked, defaultChecked, onChange, label, disabled, size = 18 }: CheckboxProps) {
  const [inner, setInner] = useState(!!defaultChecked);
  const on = checked ?? inner;
  const toggle = () => { if (disabled) return; if (checked == null) setInner(!on); onChange?.(!on); };
  return (
    <span onClick={toggle} role="checkbox" aria-checked={on} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2-5)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-medium)', userSelect: 'none', borderRadius: 'var(--radius-xs)' }}>
      <span style={{
        width: size, height: size, flexShrink: 0, borderRadius: 'var(--radius-xs)', border: on ? '0' : 'var(--border-w-strong) solid var(--border-strong)',
        background: on ? 'var(--action-primary-bg)' : 'var(--surface-control)', color: 'var(--action-primary-fg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--dur-fast)',
      }}>{on && <Icon name="check" size={size - 6} stroke={3} />}</span>
      {label}
    </span>
  );
}
