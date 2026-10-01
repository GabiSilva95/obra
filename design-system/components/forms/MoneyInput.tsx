import { useRef } from 'react';
import { Input, type InputProps } from './Input';

/** Formats a number for display in pt-BR: 1234.5 → "1.234,50". */
export function formatarMoeda(n: number | string | null | undefined) {
  if (n === '' || n === null || n === undefined || isNaN(Number(n))) return '';
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Reads only the digits and treats the last two as cents: "1.234,56", "1234.56" and "123456" all give 1234.56. */
export function parseMoeda(txt: string | null | undefined): number | '' {
  if (txt === '' || txt === null || txt === undefined) return '';
  const digitos = String(txt).replace(/\D/g, '');
  if (!digitos) return '';
  return parseInt(digitos, 10) / 100;
}

/**
 * Currency field in Brazilian format. Digits fill right-to-left like a banking app (1 → 2 → 3 → 4 shows
 * 0,01 → 0,12 → 1,23 → 12,34), so it is never in an invalid state; the caret stays at the end.
 * `onChange` receives `{ target: { value: number | '' } }`, compatible with form setters.
 */
export interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChange' | 'prefix' | 'type'> {
  value?: number | string | null;
  onChange?: (e: { target: { value: number | '' } }) => void;
  /** Currency prefix, default "R$" */
  prefix?: string;
}

export function MoneyInput({ value, onChange, prefix = 'R$', ...rest }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const caretToEnd = () => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => { const end = el.value.length; try { el.setSelectionRange(end, end); } catch { /* unsupported input */ } });
  };
  return (
    <Input {...rest} ref={ref} prefix={prefix} type="text" inputMode="numeric" placeholder="0,00" value={formatarMoeda(value)}
      inputStyle={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      onFocus={caretToEnd} onClick={caretToEnd}
      onChange={e => { onChange?.({ target: { value: parseMoeda(e.target.value) } }); caretToEnd(); }} />
  );
}
