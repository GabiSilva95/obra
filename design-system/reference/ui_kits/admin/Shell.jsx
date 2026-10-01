function useWidth() { const [w, setW] = React.useState(window.innerWidth); React.useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []); return w; }
function useMobile() { const q = () => window.innerWidth < 900; const [m, setM] = React.useState(q()); React.useEffect(() => { const h = () => setM(q()); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []); return m; }
const TITLES = { home: 'Início', obras: 'Obras', nova: 'Nova obra', pedidos: 'Pedidos de material', cronograma: 'Cronograma', mensagens: 'Mensagens', perfil: 'Meu perfil', equipes: 'Equipes', financeiro: 'Financeiro', config: 'Configurações' };
function Placeholder({ title }) { return <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}>A tela “{title}” não faz parte deste UI kit.</div>; }
function App() {
  const { Sidebar, Header, MobileTabBar } = window.DS;
  const mobile = useMobile(); const narrow = useWidth() < 1200;
  const init = new URLSearchParams(location.search).get('screen') || localStorage.getItem('cp-admin-screen') || 'home';
  const [page, setPage] = React.useState(init); const [collapsed, setCollapsed] = React.useState(false); const [drawer, setDrawer] = React.useState(false);
  const go = p => { if (p === 'menu') { setDrawer(true); return; } if (['pt', 'en', 'es', 'sair', 'idioma'].includes(p)) return; setPage(p); setDrawer(false); localStorage.setItem('cp-admin-screen', p); window.scrollTo(0, 0); };
  const S = { home: HomeScreen, obras: ObrasScreen, nova: NovaObraScreen, pedidos: PedidosScreen, cronograma: CronogramaScreen, mensagens: MensagensScreen }[page];
  const active = page === 'nova' ? 'obras' : page;
  const body = S ? <S mobile={mobile} narrow={narrow} go={go} /> : <Placeholder title={TITLES[page] || page} />;
  const logo = '../../../assets/logo-negativo.svg';
  if (mobile) return <div style={{ minHeight: '100vh', paddingBottom: 'calc(var(--mobile-tabbar-height) + 16px)' }}>
    <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-app)', padding: '0 16px' }}><Header title={TITLES[page] || ''} user={USER} compact search="none" messages={false} notifications={3} onMenu={() => setDrawer(true)} /></div>
    <main style={{ padding: 16 }}>{body}</main>
    <MobileTabBar items={TABS} activeId={TABS.some(t => t.id === active) ? active : 'menu'} onSelect={go} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 6 }} />
    {drawer && <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 8, bottom: 8, left: 8 }}><Sidebar logoSrc={logo} items={NAV} footerItems={NAV_FOOT} activeId={active} onSelect={go} onClose={() => setDrawer(false)} style={{ width: 'min(280px, calc(100vw - 48px))' }} /></div>
    </div>}
  </div>;
  return <div style={{ display: 'flex', gap: 32, padding: 16, minHeight: '100vh', alignItems: 'flex-start' }}>
    <div style={{ position: 'sticky', top: 16, height: 'calc(100vh - 32px)' }}><Sidebar logoSrc={logo} items={NAV} footerItems={NAV_FOOT} activeId={active} onSelect={go} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></div>
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24, paddingRight: 16, paddingBottom: 32 }}>
      <Header title={TITLES[page] || ''} user={USER} notifications={3} messages={3} />
      {body}
    </main>
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
