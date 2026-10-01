import { useState, type CSSProperties, type TextareaHTMLAttributes } from 'react';
import { Field, controlBox, controlReset } from './Field';

/** Multi-line field with character counter. `maxLength={null}` removes the limit and the counter. */
export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style' | 'required' | 'maxLength'> {
  label?: string; required?: boolean; info?: string; helper?: string; error?: string;
  maxLength?: number | null;
  style?: CSSProperties;
}

export function Textarea({ label, required, info, helper, error, value, defaultValue, maxLength = 500, rows = 4, disabled, onChange, onFocus, onBlur, style, ...rest }: TextareaProps) {
  const [focus, setFocus] = useState(false);
  const [typed, setTyped] = useState(String(defaultValue ?? '').length);
  const n = value !== undefined ? String(value ?? '').length : typed;
  return (
    <Field label={label} required={required} info={info} helper={helper} error={error}>
      <div style={{ ...controlBox(focus, error, disabled), height: 'auto', padding: 'var(--space-3)', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-1)', ...style }}>
        <textarea rows={rows} value={value} defaultValue={defaultValue} maxLength={maxLength ?? undefined} disabled={disabled} aria-invalid={error ? true : undefined}
          onChange={e => { setTyped(e.target.value.length); onChange?.(e); }}
          onFocus={e => { setFocus(true); onFocus?.(e); }} onBlur={e => { setFocus(false); onBlur?.(e); }}
          style={{ ...controlReset, resize: 'vertical', height: 'auto' }} {...rest} />
        {maxLength != null && <span style={{ alignSelf: 'flex-end', fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-semibold)' }}>{n}/{maxLength}</span>}
      </div>
    </Field>
  );
}
