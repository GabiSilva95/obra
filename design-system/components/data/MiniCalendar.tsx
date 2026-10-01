import { IconButton } from '../core/IconButton';

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Month picker widget with orange marked days (bookings) and red alert days (conflicts). */
export interface MiniCalendarProps { year?: number; /** 0-based */ month?: number; marked?: number[]; alert?: number[]; today?: number; onPrev?: () => void; onNext?: () => void; onSelect?: (day: number) => void; }

export function MiniCalendar({ year = 2025, month = 10, marked = [], alert = [], today, onPrev, onNext, onSelect }: MiniCalendarProps) {
  const first = (new Date(year, month, 1).getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: 'var(--type-card-title)' }}>{MESES[month]}, {year}</span>
        <div style={{ display: 'flex', gap: 'var(--space-1-5)' }}>
          <IconButton icon="chevron-left" variant="outline" round size={28} label="Anterior" onClick={onPrev} />
          <IconButton icon="chevron-right" variant="outline" round size={28} label="Próximo" onClick={onNext} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: 'var(--space-1-5)', textAlign: 'center' }}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <span key={i} style={{ fontSize: 'var(--fs-p5-5)', fontWeight: 'var(--fw-semibold)', padding: 'var(--space-1) 0' }}>{d}</span>)}
        {cells.map((d, i) => {
          const m = d != null && marked.includes(d), a = d != null && alert.includes(d), t = d === today, past = !!today && !!d && d < today && !m && !a;
          return (
            <span key={i} onClick={() => d && onSelect?.(d)} role={d ? 'button' : undefined} aria-current={t ? 'date' : undefined}
              style={{
                justifySelf: 'center', width: 'var(--space-8-5)', height: 'var(--space-8-5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-p5)', fontWeight: 'var(--fw-semibold)', cursor: d ? 'pointer' : 'default',
                background: a ? 'var(--status-danger)' : m ? 'var(--accent)' : 'transparent',
                color: a ? 'var(--text-on-solid)' : m ? 'var(--text-on-accent)' : past ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: past ? 'line-through' : 'none', boxShadow: t ? 'inset 0 0 0 var(--border-w-strong) var(--text-primary)' : 'none',
              }}>{d || ''}</span>
          );
        })}
      </div>
    </div>
  );
}
