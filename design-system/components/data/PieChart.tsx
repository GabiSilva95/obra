/** Share-of-total pie (or donut) with legend. */
export interface PieChartProps { data?: { label: string; value: number; color: string }[]; size?: number; /** 0 = pie, 0.6 = donut hole ratio */ donut?: number; }

export function PieChart({ data = [], size = 160, donut = 0 }: PieChartProps) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const stops = data.map(d => { const s = (acc / total) * 360; acc += d.value; return `${d.color} ${s}deg ${(acc / total) * 360}deg`; }).join(',');
  const mask = donut ? `radial-gradient(circle, transparent ${donut * 50}%, black ${donut * 50 + 0.5}%)` : undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
      <div role="img" aria-label={data.map(d => `${d.label} ${Math.round((d.value / total) * 100)}%`).join(', ')}
        style={{ width: size, height: size, borderRadius: '50%', background: data.length ? `conic-gradient(${stops})` : 'var(--surface-sunken)', flexShrink: 0, WebkitMask: mask, mask }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {data.map(d => (
          <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)' }}>
            <span style={{ width: 'var(--space-2-5)', height: 'var(--space-2-5)', borderRadius: '50%', background: d.color }} />{d.label}<span style={{ color: 'var(--text-secondary)' }}>{Math.round((d.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
