import { useState, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import { Field, controlBox, controlReset } from './Field';

export type SelectOption = string | { value: string | number; label: string };

/** Labelled dropdown (native select, styled). Pass `options`, or native <option> children. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style' | 'required'> {
  label?: string; required?: boolean; info?: string; helper?: string; error?: string;
  options?: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
  /** Applied to the control box */
  style?: CSSProperties;
}

export function Select({ label, required, info, helper, error, options = [], value, defaultValue, placeholder, disabled, children, style, onFocus, onBlur, ...rest }: SelectProps) {
  const [focus, setFocus] = useState(false);
  return (
    <Field label={label} required={required} info={info} helper={helper} error={error}>
      <div style={{ ...controlBox(focus, error, disabled), position: 'relative', ...style }}>
        <select value={value} defaultValue={value === undefined ? (defaultValue ?? (placeholder ? '' : undefined)) : undefined}
          disabled={disabled} aria-invalid={error ? true : undefined}
          onFocus={e => { setFocus(true); onFocus?.(e); }} onBlur={e => { setFocus(false); onBlur?.(e); }}
          style={{ ...controlReset, appearance: 'none', cursor: 'pointer', paddingRight: 'var(--space-5)' }} {...rest}>
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>)}
          {children}
        </select>
        <span style={{ position: 'absolute', right: 'var(--space-3)', pointerEvents: 'none', color: 'var(--text-secondary)', display: 'flex' }}><Icon name="chevron-down" size={16} /></span>
      </div>
    </Field>
  );
}
