import { useEffect, useState, type ComponentType } from 'react';
import { Header, MobileTabBar, Sidebar } from '../../index';
import logo from '../../assets/logo-negativo.svg';
import { NAV, NAV_FOOT, TABS, USER, type ScreenProps } from './data';
import { HomeScreen } from './HomeScreen';
import { NovaObraScreen, ObrasScreen } from './ObrasScreen';
import { PedidosScreen } from './PedidosScreen';
import { CronogramaScreen } from './CronogramaScreen';
import { MensagensScreen } from './MensagensScreen';

const TITLES: Record<string, string> = { home: 'Início', obras: 'Obras', nova: 'Nova obra', pedidos: 'Pedidos de material', cronograma: 'Cronograma', mensagens: 'Mensagens', perfil: 'Meu perfil', equipes: 'Equipes', financeiro: 'Financeiro', config: 'Configurações' };
const SCREENS: Record<string, ComponentType<ScreenProps>> = { home: HomeScreen, obras: ObrasScreen, nova: NovaObraScreen, pedidos: PedidosScreen, cronograma: CronogramaScreen, mensagens: MensagensScreen };

function useWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return w;
}

function Placeholder({ title }: { title: string }) {
  return <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}>A tela “{title}” não faz parte deste template.</div>;
}

/** App frame: sticky sidebar (collapsible) + header on desktop; compact header, bottom tabs and drawer below 900px. */
export function AdminShell({ initialScreen = 'home', forceMobile }: { initialScreen?: string; forceMobile?: boolean }) {
  const width = useWidth();
  const mobile = forceMobile ?? width < 900;
  const narrow = width < 1200;
  const [page, setPage] = useState(initialScreen);
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const go = (p: string) => {
    if (p === 'menu') { setDrawer(true); return; }
    if (['pt', 'en', 'es', 'sair', 'idioma'].includes(p)) return;
    setPage(p); setDrawer(false);
  };
  const Screen = SCREENS[page];
  const active = page === 'nova' ? 'obras' : page;
  const body = Screen ? <Screen mobile={mobile} narrow={narrow} go={go} /> : <Placeholder title={TITLES[page] || page} />;

  if (mobile) return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 'calc(var(--mobile-tabbar-height) + var(--space-4))', background: 'var(--bg-app)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-app)', padding: '0 var(--space-4)' }}>
        <Header title={TITLES[page] || ''} user={USER} compact search="none" messages={false} notifications={3} onMenu={() => setDrawer(true)} />
      </div>
      <main style={{ padding: 'var(--space-4)' }}>{body}</main>
      <MobileTabBar items={TABS} activeId={TABS.some(t => t.id === active) ? active : 'menu'} onSelect={go} style={{ position: 'sticky', left: 0, right: 0, bottom: 0, zIndex: 6 }} />
      {drawer && (
        <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'var(--scrim)', backdropFilter: 'blur(var(--blur-scrim))' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 'var(--space-2)', bottom: 'var(--space-2)', left: 'var(--space-2)' }}>
            <Sidebar logoSrc={logo} items={NAV} footerItems={NAV_FOOT} activeId={active} onSelect={go} onClose={() => setDrawer(false)} style={{ width: 'min(var(--sidebar-width), calc(100vw - var(--space-12)))' }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 'var(--space-8)', padding: 'var(--space-4)', minHeight: '100%', alignItems: 'flex-start', background: 'var(--bg-app)' }}>
      <div style={{ position: 'sticky', top: 'var(--space-4)', height: 'calc(100vh - var(--space-8))' }}>
        <Sidebar logoSrc={logo} items={NAV} footerItems={NAV_FOOT} activeId={active} onSelect={go} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingRight: 'var(--space-4)', paddingBottom: 'var(--space-8)' }}>
        <Header title={TITLES[page] || ''} user={USER} notifications={3} messages={3} />
        {body}
      </main>
    </div>
  );
}
