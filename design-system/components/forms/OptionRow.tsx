import { useState } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';
import { Checkbox } from './Checkbox';

/** Icon + label with trailing checkbox — used in category / "what's included" grids. */
export interface OptionRowProps { icon?: IconName; label: string; checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; }

export function OptionRow({ icon, label, checked, defaultChecked, onChange }: OptionRowProps) {
  const [inner, setInner] = useState(!!defaultChecked);
  const on = checked ?? inner;
  const set = (v: boolean) => { if (checked == null) setInner(v); onChange?.(v); };
  return (
    <div onClick={() => set(!on)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2-5)', padding: 'var(--space-2) 0', cursor: 'pointer', minWidth: 0 }}>
      {icon && <Icon name={icon} size={20} />}
      <span style={{ flex: 1, fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span onClick={e => e.stopPropagation()}><Checkbox checked={on} onChange={set} /></span>
    </div>
  );
}
