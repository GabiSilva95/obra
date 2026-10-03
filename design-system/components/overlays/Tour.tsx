import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '../core/Button';
import { IconButton } from '../core/IconButton';
import { Checkbox } from '../forms/Checkbox';
import { useIsMobile } from '../../hooks/useMediaQuery';

export interface TourStep {
  /** CSS selector of the element to highlight; omitted or not found = centered card */
  target?: string;
  title: ReactNode;
  content: ReactNode;
}

export interface TourResult {
  /** Reached the last step and clicked Concluir */
  completed: boolean;
  /** "Não mostrar novamente" was checked */
  dontShowAgain: boolean;
}

/** Guided tour: dims the page, spotlights one element per step and explains it in a card with Voltar / Próximo. */
export interface TourProps {
  steps: TourStep[];
  /** Called on every step change (e.g. to navigate to the page the step talks about) */
  onStepChange?: (index: number) => void;
  onClose: (result: TourResult) => void;
  /** Label of the opt-out checkbox; false hides it */
  dontShowLabel?: string | false;
  /** Step to start on */
  initialStep?: number;
}

type Rect = { top: number; left: number; width: number; height: number };

// Lê um token de tamanho (ex.: --space-3) em px, para os cálculos de posição
const px = (token: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0;

function measure(selector?: string): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  const pad = px('--space-1-5');
  return { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

const same = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

export function Tour({ steps, onStepChange, onClose, dontShowLabel = 'Não mostrar novamente', initialStep = 0 }: TourProps) {
  const [i, setI] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();
  const step = steps[i];
  const last = i === steps.length - 1;

  const go = useCallback((n: number) => {
    if (n < 0 || n >= steps.length) return;
    setI(n);
    onStepChange?.(n);
  }, [steps.length, onStepChange]);

  const close = useCallback((completed: boolean) => onClose({ completed, dontShowAgain: dontShow }), [onClose, dontShow]);

  // Avisa o passo inicial (a tela pode precisar navegar até ele)
  useEffect(() => { onStepChange?.(initialStep); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // O alvo pode aparecer depois de uma navegação, mudar de lugar com scroll ou resize:
  // remede em intervalo curto enquanto o tour está aberto.
  useEffect(() => {
    let scrolled = false;
    const tick = () => {
      const r = measure(step?.target);
      if (r && !scrolled) {
        scrolled = true;
        const el = document.querySelector(step!.target!);
        if (r.top < 0 || r.top + r.height > window.innerHeight) el?.scrollIntoView({ block: 'center' });
      }
      setRect(prev => (same(prev, r) ? prev : r));
    };
    tick();
    const id = window.setInterval(tick, 150);
    window.addEventListener('resize', tick);
    window.addEventListener('scroll', tick, true);
    return () => { window.clearInterval(id); window.removeEventListener('resize', tick); window.removeEventListener('scroll', tick, true); };
  }, [step]);

  // Posiciona o card ao lado do destaque (desktop) ou no topo/rodapé (mobile).
  // Escreve direto no DOM: a posição depende do tamanho medido do próprio card.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const setPos = (p: CSSProperties) => {
      const css = (v: string | number | undefined) => (typeof v === 'number' ? `${v}px` : v ?? '');
      Object.assign(card.style, { left: css(p.left), right: css(p.right), top: css(p.top), bottom: css(p.bottom), transform: css(p.transform), visibility: 'visible' });
    };
    const gap = px('--space-3');
    const edge = px('--space-4');
    const vw = window.innerWidth, vh = window.innerHeight;
    if (isMobile) {
      const below = !rect || rect.top + rect.height / 2 < vh / 2;
      setPos(below ? { left: edge, right: edge, bottom: edge } : { left: edge, right: edge, top: edge });
      return;
    }
    if (!rect) { setPos({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }); return; }
    const w = card.offsetWidth, h = card.offsetHeight;
    const clampTop = (t: number) => Math.max(edge, Math.min(t, vh - h - edge));
    const clampLeft = (l: number) => Math.max(edge, Math.min(l, vw - w - edge));
    if (rect.left + rect.width + gap + w <= vw - edge) setPos({ left: rect.left + rect.width + gap, top: clampTop(rect.top) });
    else if (rect.top + rect.height + gap + h <= vh - edge) setPos({ left: clampLeft(rect.left), top: rect.top + rect.height + gap });
    else if (rect.top - gap - h >= edge) setPos({ left: clampLeft(rect.left), top: rect.top - gap - h });
    else if (rect.left - gap - w >= edge) setPos({ left: rect.left - gap - w, top: clampTop(rect.top) });
    else setPos({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
  }, [rect, i, isMobile]);

  useEffect(() => { nextRef.current?.focus(); }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'ArrowRight' && !last) go(i + 1);
      else if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, last, go, close]);

  if (!step) return null;
  const anim = 'top var(--dur-slow) var(--ease-standard), left var(--dur-slow) var(--ease-standard), width var(--dur-slow) var(--ease-standard), height var(--dur-slow) var(--ease-standard)';

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-dialog)', background: rect ? 'transparent' : 'var(--scrim)' }}>
      {rect && (
        <div aria-hidden style={{
          position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 'var(--radius-md)',
          boxShadow: '0 0 0 100vmax var(--scrim)', outline: 'var(--border-w-thick) solid var(--accent)', pointerEvents: 'none', transition: anim,
        }} />
      )}
      <div ref={cardRef} role="dialog" aria-modal="true" aria-label={typeof step.title === 'string' ? step.title : 'Tour'}
        style={{
          position: 'fixed', width: isMobile ? 'auto' : 'min(var(--dialog-w), calc(100vw - 2 * var(--space-4)))', background: 'var(--surface-raised)',
          border: 'var(--border-w) solid var(--border-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-pop)',
          padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', visibility: 'hidden',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }} aria-label={`Passo ${i + 1} de ${steps.length}`}>
            {steps.map((_, n) => (
              <span key={n} style={{
                width: n === i ? 'var(--space-4)' : 'var(--space-1-5)', height: 'var(--space-1-5)', borderRadius: 'var(--radius-pill)',
                background: n <= i ? 'var(--accent)' : 'var(--border-default)', transition: 'width var(--dur-base) var(--ease-standard)',
              }} />
            ))}
          </div>
          <IconButton icon="x" size={32} label="Fechar tour" onClick={() => close(false)} />
        </div>
        <div style={{ fontSize: 'var(--fs-p6)', fontWeight: 'var(--fw-bold)', color: 'var(--text-muted)', letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase' }}>
          Passo {i + 1} de {steps.length}
        </div>
        <div style={{ fontSize: 'var(--fs-h5)', fontWeight: 'var(--fw-extrabold)', lineHeight: 'var(--lh-snug)', textWrap: 'balance' }}>{step.title}</div>
        <div style={{ fontSize: 'var(--fs-p5-5)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-body)' }}>{step.content}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          {dontShowLabel ? <Checkbox checked={dontShow} onChange={setDontShow} label={dontShowLabel} /> : <span />}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
            {i > 0 && <Button variant="secondary" size="sm" onClick={() => go(i - 1)}>Voltar</Button>}
            <Button ref={nextRef} variant="primary" size="sm" iconRight={last ? undefined : 'arrow-right'} onClick={() => (last ? close(true) : go(i + 1))}>
              {last ? 'Concluir' : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
