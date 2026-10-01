import { Fragment } from 'react';
import { Icon } from '../core/Icon';

/** Multi-step form progress ("Etapa 2 · 25% concluído"). */
export interface StepperProps { steps?: number; /** 1-based */ current?: number; label?: string; progressLabel?: string; }

function Dot({ i, current }: { i: number; current: number }) {
  const done = i < current, cur = i === current;
  return (
    <span aria-current={cur ? 'step' : undefined} style={{
      width: 'var(--space-6-5)', height: 'var(--space-6-5)', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-bold)',
      background: done ? 'var(--action-primary-bg)' : 'var(--surface-control)', color: done ? 'var(--action-primary-fg)' : cur ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: done ? 0 : 'var(--border-w-strong) solid ' + (cur ? 'var(--text-primary)' : 'var(--border-strong)'),
    }}>{done ? <Icon name="check" size={14} stroke={3} /> : i}</span>
  );
}

export function Stepper({ steps = 4, current = 1, label, progressLabel }: StepperProps) {
  const pct = Math.round(((current - 1) / steps) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-semibold)' }}><span>{label || 'Etapa ' + current}</span><span>{progressLabel || pct + '% concluído'}</span></div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {Array.from({ length: steps }, (_, k) => {
          const i = k + 1;
          const fill = i < current ? 1 : i === current ? 0.5 : 0;
          return (
            <Fragment key={i}>
              <span style={{ flex: 1, height: 'var(--space-0-5)', background: `linear-gradient(90deg,var(--action-primary-bg) ${fill * 100}%,var(--border-default) ${fill * 100}%)` }} />
              <Dot i={i} current={current} />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
