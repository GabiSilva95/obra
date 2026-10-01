import { Icon } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { MESES } from './MiniCalendar';

export interface CalendarEvent { start: number; end: number; title: string; sub?: string; /** Use a --cp-data-* colour */ color?: string; textColor?: string; }

/** Full month schedule grid with multi-day event bars (days within the month, 1-based). */
export interface MonthCalendarProps { year?: number; month?: number; events?: CalendarEvent[]; today?: number; onPrev?: () => void; onNext?: () => void; onEventClick?: (e: CalendarEvent) => void; /** Mobile: short weekday names, thin bars */ compact?: boolean; }

export function MonthCalendar({ year = 2025, month = 10, events = [], today, onPrev, onNext, onEventClick, compact }: MonthCalendarProps) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate(), prevDays = new Date(year, month, 0).getDate();
  const total = Math.ceil((first + days) / 7) * 7;
  const weeks = Array.from({ length: total / 7 }, (_, w) => Array.from({ length: 7 }, (_, c) => {
    const n = w * 7 + c - first + 1;
    return n < 1 ? { n: prevDays + n, out: true } : n > days ? { n: n - days, out: true } : { n, out: false };
  }));
  const rowH = compact ? 72 : 108;
  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: 'var(--border-w) solid var(--border-card)', padding: 'var(--space-4)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <IconButton icon="chevron-left" variant="outline" round size={28} label="Anterior" onClick={onPrev} />
        <span style={{ fontSize: 'var(--fs-p4)', fontWeight: 'var(--fw-bold)' }}>{MESES[month]}, {year}</span>
        <IconButton icon="chevron-right" variant="outline" round size={28} label="Próximo" onClick={onNext} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)', paddingBottom: 'var(--space-2)' }}>
        {(compact ? ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']).map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ borderTop: 'var(--border-w) solid var(--border-default)', borderLeft: 'var(--border-w) solid var(--border-default)' }}>
        {weeks.map((wk, w) => {
          const ws = w * 7 - first + 1, we = ws + 6;
          const evs = events.filter(e => e.end >= ws && e.start <= we);
          return (
            <div key={w} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', height: rowH }}>
              {wk.map((d, c) => {
                const isToday = d.n === today && !d.out;
                return (
                  <div key={c} style={{ borderRight: 'var(--border-w) solid var(--border-default)', borderBottom: 'var(--border-w) solid var(--border-default)', padding: 'var(--space-1-5)', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: 'var(--space-5-5)', height: 'var(--space-5-5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-bold)', color: d.out ? 'var(--text-calendar-out)' : isToday ? 'var(--text-inverse)' : 'var(--text-primary)', background: isToday ? 'var(--surface-inverse)' : 'transparent' }}>{d.n}</span>
                  </div>
                );
              })}
              {evs.map((e, k) => {
                const s = Math.max(e.start, ws) - ws, en = Math.min(e.end, we) - ws;
                return (
                  <div key={k} role="button" tabIndex={0} onClick={() => onEventClick?.(e)} onKeyDown={ev => { if (ev.key === 'Enter') onEventClick?.(e); }}
                    style={{
                      position: 'absolute', left: `calc(${(s / 7) * 100}% + var(--space-1))`, width: `calc(${((en - s + 1) / 7) * 100}% - var(--space-2))`, top: `calc(var(--space-8-5) + ${k} * ${compact ? 'var(--space-5-5)' : 'var(--space-7-5)'})`, height: compact ? 'var(--space-5)' : 'var(--space-11)',
                      background: e.color || 'var(--accent)', color: e.textColor || 'var(--text-on-solid)', borderRadius: compact ? 'var(--radius-sm-inner)' : 'var(--radius-md)', padding: compact ? '0 var(--space-1-5)' : 'var(--space-1-5) var(--space-2-5)',
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box',
                    }}>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', fontSize: compact ? 'var(--fs-micro)' : 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)', lineHeight: 'var(--lh-snug)' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                      {!compact && e.sub && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.9 }}>{e.sub}</span>}
                    </span>
                    {!compact && <span style={{ width: 'var(--space-5-5)', height: 'var(--space-5-5)', flexShrink: 0, border: 'var(--border-w-strong) solid currentColor', borderRadius: 'var(--radius-sm-inner)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-down-right" size={14} /></span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
