import { forwardRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import type { IconName } from '../core/iconData';
import { Field, controlBox, controlReset } from './Field';

/** Labelled text field (text, password, number, search, with currency/phone prefix). Extra native input props are forwarded. */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'style' | 'required'> {
  label?: string;
  /** Shows the red asterisk (visual only) */
  required?: boolean;
  /** Tooltip text shown via the ⓘ next to the label */
  info?: string;
  helper?: string;
  /** Error message; turns the border red */
  error?: string;
  /** Inline prefix like "R$" or "+55" */
  prefix?: string;
  /** Leading icon name */
  icon?: IconName;
  /** Applied to the control box */
  style?: CSSProperties;
  inputStyle?: CSSProperties;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, required, info, helper, error, type = 'text', prefix, icon, disabled, style, inputStyle, onFocus, onBlur, ...rest }, ref,
) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <Field label={label} required={required} info={info} helper={helper} error={error}>
      <div style={{ ...controlBox(focus, error, disabled), ...style }}>
        {icon && <Icon name={icon} size={16} color="var(--text-secondary)" />}
        {prefix && <span style={{ fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)', paddingRight: 'var(--space-2)', borderRight: 'var(--border-w) solid var(--border-default)' }}>{prefix}</span>}
        <input ref={ref} type={isPw && show ? 'text' : type} disabled={disabled} aria-invalid={error ? true : undefined}
          onFocus={e => { setFocus(true); onFocus?.(e); }} onBlur={e => { setFocus(false); onBlur?.(e); }}
          style={{ ...controlReset, ...inputStyle }} {...rest} />
        {isPw && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', background: 'none', border: 0, padding: 0 }}>
            <Icon name={show ? 'eye' : 'eye-off'} size={16} />
          </button>
        )}
      </div>
    </Field>
  );
});
