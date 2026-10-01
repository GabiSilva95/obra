export interface BarSeries { key: string; label: string; color: string; }

/** Grouped vertical bars (default 2 series: accent + ink) with legend. */
export interface BarChartProps { data?: ({ label: string } & Record<string, string | number>)[]; series?: BarSeries[]; max?: number; ticks?: number; height?: number; }

const DEFAULT_SERIES: BarSeries[] = [{ key: 'a', label: 'A', color: 'var(--accent)' }, { key: 'b', label: 'B', color: 'var(--text-primary)' }];

export function BarChart({ data = [], series = DEFAULT_SERIES, max, ticks = 4, height = 200 }: BarChartProps) {
  const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
  const mx = max || Math.ceil(Math.max(...data.flatMap(d => series.map(s => num(d[s.key]))), 1) / 50) * 50;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        {series.map(s => <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1-5)', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)' }}><span style={{ width: 'var(--space-2-5)', height: 'var(--space-2-5)', borderRadius: '50%', background: s.color }} />{s.label}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', columnGap: 'var(--space-3)', rowGap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height, textAlign: 'right', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)' }}>
          {Array.from({ length: ticks + 1 }, (_, i) => <span key={i} style={{ lineHeight: 0 }}>{Math.round(mx - (i * mx) / ticks)}</span>)}
        </div>
        <div style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', backgroundImage: `repeating-linear-gradient(to bottom, var(--border-default) 0 var(--border-w), transparent var(--border-w) ${height / ticks}px)`, backgroundSize: `100% ${height / ticks}px` }}>
          {data.length === 0 && <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-p5-5)' }}>Sem dados no período.</span>}
          {data.map((d, i) => (
            <div key={i} title={series.map(s => s.label + ': ' + d[s.key]).join(' · ')} style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-1)', height: '100%' }}>
              {series.map(s => <span key={s.key} style={{ width: 'clamp(var(--space-2),2.2vw,var(--space-6))', height: `${(num(d[s.key]) / mx) * 100}%`, background: s.color, borderRadius: 'var(--radius-sm-inner) var(--radius-sm-inner) 0 0', transition: 'height var(--dur-slow) var(--ease-standard)' }} />)}
            </div>
          ))}
        </div>
        <span />
        <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)' }}>{data.map((d, i) => <span key={i}>{d.label}</span>)}</div>
      </div>
    </div>
  );
}
