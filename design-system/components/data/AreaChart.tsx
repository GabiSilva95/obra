import { useId, useState } from 'react';

/** Smooth orange area chart with dashed gridlines and dark hover tooltip. */
export interface AreaChartProps { data?: number[]; labels?: string[]; max?: number; ticks?: number; height?: number; /** Index shown with tooltip by default */ highlight?: number; format?: (v: number) => string; color?: string; }

type Pt = [number, number];

function smooth(pts: Pt[]) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6) + ',' + (p1[1] + (p2[1] - p0[1]) / 6) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6) + ',' + (p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ',' + p2[1];
  }
  return d;
}

export function AreaChart({ data = [], labels = [], max, ticks = 5, height = 220, highlight, format = v => String(v), color = 'var(--accent)' }: AreaChartProps) {
  const id = useId().replace(/:/g, '');
  const [hi, setHi] = useState(highlight);
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-p5-5)' }}>Sem dados no período.</div>;
  const mx = max || Math.ceil(Math.max(...data, 1) / 100) * 100;
  const W = 600, H = 200, span = Math.max(data.length - 1, 1);
  const pts: Pt[] = data.map((v, i) => [(i / span) * W, H - (v / mx) * H]);
  const line = smooth(pts), area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gridTemplateRows: height + 'px auto', columnGap: 'var(--space-3)', rowGap: 'var(--space-2)', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
        {Array.from({ length: ticks + 1 }, (_, i) => <span key={i} style={{ lineHeight: '0' }}>{format(Math.round(mx - (i * mx) / ticks))}</span>)}
      </div>
      <div style={{ position: 'relative', minWidth: 0 }} onMouseLeave={() => setHi(highlight)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <defs><linearGradient id={'g' + id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".5" /><stop offset="1" stopColor={color} stopOpacity=".04" /></linearGradient></defs>
          {Array.from({ length: ticks + 1 }, (_, i) => <line key={i} x1="0" x2={W} y1={(i * H) / ticks} y2={(i * H) / ticks} stroke="var(--border-default)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill={`url(#g${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {hi != null && pts[hi] && <line x1={pts[hi][0]} x2={pts[hi][0]} y1={pts[hi][1]} y2={H} stroke="var(--text-primary)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        </svg>
        {data.map((_, i) => (
          <div key={i} onMouseEnter={() => setHi(i)} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i / span) * 100 - 50 / span}%`, width: `${100 / span}%` }} />
        ))}
        {hi != null && pts[hi] && (
          <span style={{ position: 'absolute', left: `${(hi / span) * 100}%`, top: `${(pts[hi][1] / H) * 100}%`, transform: 'translate(-50%,-140%)', background: 'var(--surface-inverse)', color: 'var(--text-inverse)', padding: 'var(--space-1-5) var(--space-2)', borderRadius: 'var(--radius-sm-inner)', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-bold)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{format(data[hi])}</span>
        )}
      </div>
      <span />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>{labels.map((l, i) => <span key={i} style={{ fontSize: 'var(--fs-p6)' }}>{l}</span>)}</div>
    </div>
  );
}
