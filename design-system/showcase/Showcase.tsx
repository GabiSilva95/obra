import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  AlertDialog, AreaChart, Avatar, Badge, Banner, BarChart, Button, Card, ChatBubble, Checkbox, DataTable, FilterPill, Header, ICON_NAMES, Icon, IconButton,
  Input, ListingCard, MessageItem, MiniCalendar, MobileTabBar, Modal, MoneyInput, MonthCalendar, OptionRow, PieChart, ProductCard, ProgressBar, SegmentedTabs, Select,
  Sidebar, StatCard, Stepper, Tag, Textarea, UploadBox, type BadgeTone, type ButtonVariant, type NavItemDef,
} from '../index';
import { AdminShell } from '../templates';
import logoNeg from '../assets/logo-negativo.svg';
import logoPos from '../assets/logo-positivo.svg';

type Theme = 'light' | 'dark';
type Mode = Theme | 'both';

const row: CSSProperties = { display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' };
const col: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' };
const grid = (min: number): CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))`, gap: 'var(--space-4)', alignItems: 'start' });
const label: CSSProperties = { fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-bold)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' };

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', scrollMarginTop: 80 }}>
      <div><h2 style={{ margin: 0, font: 'var(--type-page-title)', fontSize: 'var(--fs-h4)' }}>{title}</h2>{note && <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)', fontSize: 'var(--fs-p5-5)' }}>{note}</p>}</div>
      {children}
    </section>
  );
}

function Demo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ ...col, padding: 'var(--space-4)', border: 'var(--border-w) dashed var(--border-default)', borderRadius: 'var(--radius-md)', minWidth: 0 }}>
      <span style={label}>{name}</span>
      {children}
    </div>
  );
}

const SWATCHES = ['--bg-app', '--surface-card', '--surface-raised', '--surface-sunken', '--surface-inverse', '--surface-sidebar', '--surface-control', '--surface-row-hover', '--text-primary', '--text-secondary', '--text-muted', '--text-faint', '--text-accent', '--accent', '--accent-hover', '--accent-soft', '--action-primary-bg', '--action-secondary-bg', '--action-danger-bg', '--border-default', '--border-subtle', '--border-strong', '--border-card', '--status-success', '--status-warning', '--status-danger', '--status-info', '--stat-1', '--stat-2', '--stat-3', '--stat-4'];
const DATA_COLORS = ['yellow', 'orange', 'pink', 'magenta', 'purple', 'violet', 'turquoise', 'blue', 'electric', 'green'];
const TYPE_SCALE: [string, string, number][] = [['H1', '--fs-h1', 800], ['H2', '--fs-h2', 800], ['H3 · page title', '--fs-h3', 700], ['H4', '--fs-h4', 700], ['H5', '--fs-h5', 600], ['H6', '--fs-h6', 600], ['P2 · card title', '--fs-p2', 600], ['P4', '--fs-p4', 500], ['P5 · body', '--fs-p5', 500], ['P6 · label', '--fs-p6', 600], ['Micro', '--fs-micro', 600]];
const SPACES = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12', '--space-16', '--space-24'];
const RADII = ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-pill'];
const SHADOWS = ['--shadow-card', '--shadow-raised', '--shadow-pop', '--shadow-nav-glow'];
const VARIANTS: ButtonVariant[] = ['primary', 'accent', 'secondary', 'ghost', 'link', 'danger'];
const TONES: BadgeTone[] = ['danger', 'error', 'neutral', 'warning', 'info', 'cyan', 'success', 'electric', 'orange', 'accent', 'dark'];
const NAV: NavItemDef[] = [
  { id: 'home', label: 'Início', icon: 'layout-grid' }, { id: 'obras', label: 'Obras', icon: 'building-2', children: [{ id: 'ativas', label: 'Ativas' }, { id: 'arquivadas', label: 'Arquivadas' }] },
  { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list', badge: 4 }, { id: 'estoque', label: 'Estoque', icon: 'warehouse' }, { id: 'agenda', label: 'Cronograma', icon: 'calendar' },
];
const NAV_FOOT: NavItemDef[] = [{ id: 'config', label: 'Configurações', icon: 'settings' }, { id: 'sair', label: 'Sair', icon: 'log-out' }];
const TABS = [{ id: 'home', label: 'Início', icon: 'layout-grid' as const }, { id: 'obras', label: 'Obras', icon: 'building-2' as const }, { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list' as const }, { id: 'menu', label: 'Menu', icon: 'menu' as const }];
const ROWS = [{ id: 'PC-2052', obra: 'Vila Nova · B', cat: 'Estrutural', st: 'Pago 100%', t: 'success' as BadgeTone }, { id: 'PC-2053', obra: 'Ed. Aurora', cat: 'Acabamento', st: 'Pendente', t: 'warning' as BadgeTone }, { id: 'PC-2057', obra: 'Rota 101', cat: 'Agregados', st: 'Falhou', t: 'error' as BadgeTone }];
const COLS = [{ key: 'id', label: 'Pedido' }, { key: 'obra', label: 'Obra' }, { key: 'cat', label: 'Categoria', render: (r: typeof ROWS[number]) => <Tag>{r.cat}</Tag> }, { key: 'st', label: 'Status', render: (r: typeof ROWS[number]) => <Badge size="sm" tone={r.t}>{r.st}</Badge> }];

function Library({ theme }: { theme: Theme }) {
  const [nav, setNav] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const [seg, setSeg] = useState('Todas');
  const [check, setCheck] = useState(true);
  const [text, setText] = useState('Concretagem prevista para quinta-feira.');
  const [card, setCard] = useState(1);
  const [money, setMoney] = useState<number | ''>(4250);
  const [modal, setModal] = useState(false);
  const [alert, setAlert] = useState<null | 'notice' | 'confirm'>(null);
  return (
    <div data-theme={theme} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', minWidth: 0, borderRadius: 'var(--radius-lg)' }}>
      <Section id={`${theme}-foundations`} title="Fundamentos" note="Tokens semânticos do tema atual. A fonte da verdade é o DESIGN.md na raiz.">
        <Demo name="Cores semânticas">
          <div style={grid(170)}>{SWATCHES.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
              <span style={{ width: 'var(--space-7)', height: 'var(--space-7)', flexShrink: 0, borderRadius: 'var(--radius-sm)', background: `var(${s})`, border: 'var(--border-w) solid var(--border-default)' }} />
              <code style={{ fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-bold)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</code>
            </div>
          ))}</div>
        </Demo>
        <Demo name="Marca e dados">
          <div style={row}>{['--cp-orange', '--cp-orange-700', '--cp-orange-300', '--cp-stone', '--cp-black', ...DATA_COLORS.map(c => `--cp-data-${c}`)].map(s => <span key={s} title={s} style={{ width: 'var(--space-10)', height: 'var(--space-10)', borderRadius: 'var(--radius-md)', background: `var(${s})` }} />)}</div>
        </Demo>
        <Demo name="Tipografia · Nunito">
          <div style={col}>{TYPE_SCALE.map(([n, v, w]) => <div key={n} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}><span style={{ ...label, width: 'var(--col-min-xs)', flexShrink: 0 }}>{n}</span><span style={{ fontSize: `var(${v})`, fontWeight: w, lineHeight: 'var(--lh-tight)' }}>Do canteiro ao escritório</span></div>)}</div>
          <span style={{ font: 'var(--type-stat)', color: 'var(--stat-4)' }}>R$ 342k <span style={{ font: 'var(--type-label)', color: 'var(--text-secondary)' }}>type-stat</span></span>
        </Demo>
        <div style={grid(260)}>
          <Demo name="Espaçamento">{SPACES.map(s => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><span style={{ width: `var(${s})`, height: 'var(--space-3)', background: 'var(--accent)', borderRadius: 'var(--space-0-5)' }} /><code style={{ fontSize: 'var(--fs-caption)' }}>{s}</code></div>)}</Demo>
          <Demo name="Raios"><div style={row}>{RADII.map(r => <div key={r} style={{ ...col, alignItems: 'center', gap: 'var(--space-1)' }}><span style={{ width: 'var(--space-14)', height: 'var(--space-11)', background: 'var(--surface-sunken)', border: 'var(--border-w) solid var(--border-default)', borderRadius: `var(${r})` }} /><code style={{ fontSize: 'var(--fs-micro)' }}>{r.replace('--radius-', '')}</code></div>)}</div></Demo>
          <Demo name="Elevação"><div style={row}>{SHADOWS.map(s => <div key={s} style={{ width: 'var(--space-24)', height: 'var(--space-14)', borderRadius: 'var(--radius-md)', background: s === '--shadow-nav-glow' ? 'var(--accent)' : 'var(--surface-card)', boxShadow: `var(${s})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-bold)' }}>{s.replace('--shadow-', '')}</div>)}</div></Demo>
        </div>
        <Demo name={`Ícones (${ICON_NAMES.length}) · Lucide 1.5`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))', gap: 'var(--space-2)' }}>
            {ICON_NAMES.map(n => <div key={n} title={n} style={{ ...col, alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2)', minWidth: 0 }}><Icon name={n} size={22} /><span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span></div>)}
          </div>
        </Demo>
        <Demo name="Logo · negativo / positivo">
          <div style={row}>
            <div style={{ background: 'var(--cp-black)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', width: 'var(--sidebar-width)' }}><img src={logoNeg} alt="ConstruktPro negativo" style={{ width: '100%' }} /></div>
            <div style={{ background: 'var(--cp-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', width: 'var(--sidebar-width)' }}><img src={logoPos} alt="ConstruktPro positivo" style={{ width: '100%' }} /></div>
          </div>
        </Demo>
      </Section>

      <Section id={`${theme}-core`} title="Core" note="Hover, active (scale .98) e focus (anel laranja) são ao vivo: passe o mouse, clique e navegue com Tab.">
        <Demo name="Button · variantes × tamanhos">
          {(['sm', 'md', 'lg'] as const).map(size => <div key={size} style={row}>{VARIANTS.map(v => <Button key={v} variant={v} size={size} iconLeft={v === 'link' ? undefined : 'plus'}>{v}</Button>)}</div>)}
        </Demo>
        <Demo name="Button · estados">
          <div style={row}>
            <Button>Default</Button><Button disabled>Disabled</Button><Button loading>Salvando…</Button><Button variant="accent" loading>Loading accent</Button>
            <Button variant="secondary" iconLeft="chevron-left">Voltar</Button><Button variant="ghost" iconRight="chevron-right">Ver tudo</Button><Button variant="danger" disabled iconLeft="trash-2">Excluir</Button>
          </div>
          <div style={{ maxWidth: 'var(--col-min-lg)' }}><Button fullWidth iconRight="chevron-right">Full width</Button></div>
        </Demo>
        <Demo name="IconButton · variantes, badge, round, disabled">
          <div style={row}>
            <IconButton icon="search" label="Buscar" /><IconButton icon="bell" label="Notificações" badge={3} /><IconButton icon="pencil" variant="outline" size={32} label="Editar" />
            <IconButton icon="send" variant="dark" label="Enviar" /><IconButton icon="trash-2" variant="danger" size={28} label="Excluir" />
            <span style={{ background: 'var(--surface-sidebar)', padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)' }}><IconButton icon="settings" variant="inverse" label="Inverse" /></span>
            <IconButton icon="chevron-right" variant="outline" round size={28} label="Próximo" /><IconButton icon="x" label="Disabled" disabled />
          </div>
        </Demo>
        <Demo name="Badge · tons × tamanhos">
          <div style={row}>{TONES.map(t => <Badge key={t} tone={t}>{t}</Badge>)}</div>
          <div style={row}>{TONES.map(t => <Badge key={t} tone={t} size="sm">{t}</Badge>)}</div>
        </Demo>
        <Demo name="Tag · tons, dot, count, active (selecionado)">
          <div style={row}>
            {(['accent', 'neutral', 'success', 'danger', 'dark'] as const).map(t => <Tag key={t} tone={t}>{t}</Tag>)}
            <Tag tone="neutral" dot="var(--cp-data-blue)">Residencial</Tag><Tag tone="success" dot>Aprovado</Tag>
            <Tag tone="neutral" count={8} active onClick={() => {}}>Todos</Tag><Tag tone="neutral" count={3} onClick={() => {}}>Fornecedores</Tag>
          </div>
        </Demo>
        <Demo name="Avatar · iniciais, online, tamanhos">
          <div style={row}><Avatar name="Marina Costa" size={32} /><Avatar name="Carlos Mendes" online /><Avatar name="Ana Ribeiro" size={56} online /><Avatar /></div>
        </Demo>
      </Section>

      <Section id={`${theme}-forms`} title="Formulários">
        <div style={grid(260)}>
          <Input label="Nome da obra" required info="Como aparece no relatório" placeholder="Ex.: Residencial Vila Nova" helper="Mensagem informativa" />
          <Input label="Senha" type="password" defaultValue="canteiro123" />
          <Input label="Buscar" icon="search" placeholder="Obra, insumo…" />
          <Input label="Telefone" prefix="+55" placeholder="(41) 99999-0000" />
          <Input label="Valor do m²" prefix="R$" defaultValue="4.250,00" error="Valor acima do orçamento" />
          <Input label="Inativo" placeholder="Desabilitado" disabled />
          <Select label="Tipo" placeholder="Selecione" options={['Residencial', 'Comercial', 'Industrial']} />
          <Select label="Obra (children)" defaultValue="2"><option value="1">Vila Nova</option><option value="2">Ed. Aurora</option></Select>
          <Select label="Com erro" required placeholder="Selecione" options={['A', 'B']} error="Campo obrigatório" />
          <Select label="Desabilitado" options={['Residencial']} disabled />
        </div>
        <div style={grid(300)}>
          <Textarea label="Observações" value={text} onChange={e => setText(e.target.value)} rows={3} />
          <Textarea label="Com erro" defaultValue="Texto" error="Descreva melhor" rows={3} maxLength={200} />
          <Textarea label="Sem limite" placeholder="maxLength={null}" maxLength={null} rows={3} />
          <Textarea label="Desabilitado" defaultValue="Somente leitura" disabled rows={3} />
        </div>
        <div style={grid(260)}>
          <Demo name="Checkbox">
            <Checkbox label="Controlado" checked={check} onChange={setCheck} /><Checkbox label="Desmarcado" /><Checkbox label="Desabilitado marcado" defaultChecked disabled /><Checkbox label="Desabilitado" disabled />
          </Demo>
          <Demo name="OptionRow"><OptionRow icon="shovel" label="Fundação" defaultChecked /><OptionRow icon="hammer" label="Alvenaria" /><OptionRow icon="zap" label="Elétrica" defaultChecked /></Demo>
          <Demo name="FilterPill"><FilterPill options={['Últimos 6 meses', 'Último ano', 'Este mês']} /></Demo>
        </div>
        <div style={grid(300)}>
          <MoneyInput label="Valor (MoneyInput)" required value={money} onChange={e => setMoney(e.target.value)} helper="Dígitos preenchem da direita: 1 → 0,01" />
          <MoneyInput label="Com erro" value={0} error="Informe um valor" />
          <MoneyInput label="Desabilitado" value={1990.5} disabled />
        </div>
        <div style={grid(300)}>
          <UploadBox title="Enviar fotos" formats="JPG, PNG até 5 MB" height={130} />
          <UploadBox title="Arraste ou escolha (onFiles)" accept=".xml" onFiles={() => {}} height={130} />
          <UploadBox title="Enviando…" busy height={130} />
          <UploadBox title="Desabilitado" disabled height={130} />
        </div>
      </Section>

      <Section id={`${theme}-feedback`} title="Feedback e sobreposições" note="Banner inline, Modal (bottom sheet abaixo de 640px) e AlertDialog para avisos/confirmações.">
        <div style={col}>
          <Banner tone="info" title="Informação">Etapas são criadas automaticamente ao escolher um tipo de obra.</Banner>
          <Banner tone="success">Ordem marcada como entregue. 3 lotes deram entrada no estoque.</Banner>
          <Banner tone="warning" title="Atenção">Não há ordens aprovadas para vincular.</Banner>
          <Banner tone="danger" title="Limite atingido" action={<Button size="sm" variant="danger">Fazer upgrade</Button>}>Faça upgrade para adicionar mais usuários.</Banner>
          <Banner tone="accent" title="Total da ordem">R$ 15.200,00</Banner>
        </div>
        <Demo name="ProgressBar · automático, cores, vazio">
          <ProgressBar value={30} label="30%" /><ProgressBar value={85} label="85%" /><ProgressBar value={100} label="100%" />
          <ProgressBar value={95} color="var(--status-danger)" label="Estourado" /><ProgressBar value={0} label="Vazio" />
        </Demo>
        <div style={row}>
          <Button variant="secondary" onClick={() => setModal(true)}>Abrir Modal</Button>
          <Button variant="secondary" onClick={() => setAlert('notice')}>Aviso (AlertDialog)</Button>
          <Button variant="danger" onClick={() => setAlert('confirm')}>Confirmação perigosa</Button>
        </div>
        {modal && (
          <Modal title="Nova ordem de compra" onClose={() => setModal(false)}
            footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button iconLeft="check" onClick={() => setModal(false)}>Salvar</Button></>}>
            <div style={col}><Input label="Fornecedor" required placeholder="Nome" /><MoneyInput label="Valor" value={money} onChange={e => setMoney(e.target.value)} /></div>
          </Modal>
        )}
        {alert === 'notice' && <AlertDialog tone="success" title="Tudo certo" message="Ordem de compra criada." onConfirm={() => setAlert(null)} onCancel={() => setAlert(null)} />}
        {alert === 'confirm' && <AlertDialog tone="error" title="Remover obra?" message="Esta ação não pode ser desfeita." confirmLabel="Remover" cancelLabel="Cancelar" danger onConfirm={() => setAlert(null)} onCancel={() => setAlert(null)} />}
      </Section>

      <Section id={`${theme}-navigation`} title="Navegação">
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <Sidebar height={520} logoSrc={logoNeg} items={NAV} footerItems={NAV_FOOT} activeId={nav} onSelect={setNav} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          <Sidebar height={520} brand="ConstruktPro" items={NAV} activeId={nav} onSelect={setNav} onClose={() => {}} style={{ width: 'var(--col-min-md)' }}
            footer={<div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-on-sidebar-muted)' }}>Slot footer · usuário / tenant</div>} footerItems={NAV_FOOT} />
          <Sidebar height={520} collapsed items={NAV} footerItems={NAV_FOOT} activeId="ativas" />
          <div style={{ ...col, flex: 1, minWidth: 'var(--sidebar-width)' }}>
            <MobileTabBar items={TABS} activeId="obras" />
            <div style={{ maxWidth: 'var(--preview-w-phone)' }}><MobileTabBar items={TABS} activeId="menu" /></div>
          </div>
        </div>
        <Demo name="Header · search icon / field / none / compact">
          <Header title="Início" user={{ name: 'Marina Costa', role: 'Admin' }} notifications={3} messages={2} />
          <Header title="Pedidos" search="field" user={{ name: 'Marina Costa', role: 'Admin' }} actions={<Button size="sm" iconLeft="plus">Novo pedido</Button>} />
          <Header title="Cronograma" search="none" messages={false} />
          <Header title="Com slot de notificações" search="none" messages={false} notificationsSlot={<IconButton icon="bell" label="Notificações (custom)" badge="9+" />} actions={<Button size="sm" variant="secondary">Ação da página</Button>} />
          <div style={{ maxWidth: 'var(--preview-w-phone)' }}><Header title="Obras" compact search="none" messages={false} notifications={1} onMenu={() => {}} user={{ name: 'Marina Costa' }} /></div>
        </Demo>
        <div style={grid(300)}>
          <Demo name="Stepper"><Stepper steps={4} current={1} /><Stepper steps={4} current={3} /><Stepper steps={4} current={5} label="Concluído" progressLabel="100% concluído" /></Demo>
          <Demo name="SegmentedTabs">
            <SegmentedTabs tabs={['Todas', 'Residencial', 'Comercial']} value={seg} onChange={setSeg} />
            <SegmentedTabs variant="light" tabs={[{ value: 'a', label: 'Todos', count: 8 }, { value: 'b', label: 'Clientes', count: 3 }]} />
            <SegmentedTabs variant="light" fullWidth tabs={['Posição', 'Baixa', 'Transferências']} />
          </Demo>
        </div>
      </Section>

      <Section id={`${theme}-data`} title="Dados">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--space-4)' }}>
          <StatCard value="24" label="Obras ativas" color="var(--stat-1)" /><StatCard value="103" label="Entregas na semana" color="var(--stat-2)" />
          <StatCard value="86" label="Equipes em campo" color="var(--stat-3)" /><StatCard value="R$ 342k" label="Receita do mês" color="var(--stat-4)" icon={<Icon name="wallet" color="var(--stat-4)" />} />
        </div>
        <div style={grid(260)}>
          <Card title="Card com ação" action={<FilterPill options={['Últimos 6 meses']} />}>Conteúdo do card.</Card>
          <Card title="Clicável" icon={<Icon name="hard-hat" />} onClick={() => setCard(1)} selected={card === 1}>Selecionado. Clique no outro.</Card>
          <Card title="Clicável" icon={<Icon name="truck" />} onClick={() => setCard(2)} selected={card === 2}>Hover mostra borda laranja.</Card>
          <Card>Card sem título (padding 20).</Card>
        </div>
        <div style={grid(340)}>
          <Card title="Receita"><AreaChart height={140} data={[180, 260, 150, 420, 300, 240, 380, 460]} labels={['Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov']} highlight={3} format={v => 'R$' + v + 'k'} /></Card>
          <Card title="Medições"><BarChart height={140} series={[{ key: 'a', label: 'Previsto', color: 'var(--accent)' }, { key: 'b', label: 'Realizado', color: 'var(--text-primary)' }]} data={[{ label: 'Seg', a: 200, b: 120 }, { label: 'Ter', a: 160, b: 60 }, { label: 'Qua', a: 190, b: 110 }, { label: 'Qui', a: 150, b: 70 }]} /></Card>
          <Card title="Participação"><PieChart data={[{ label: 'Residencial', value: 42, color: 'var(--cp-data-blue)' }, { label: 'Comercial', value: 33, color: 'var(--cp-data-yellow)' }, { label: 'Industrial', value: 25, color: 'var(--cp-data-pink)' }]} /></Card>
          <Card title="Donut"><PieChart donut={0.6} size={130} data={[{ label: 'Concluídas', value: 7, color: 'var(--status-success)' }, { label: 'Em andamento', value: 5, color: 'var(--accent)' }]} /></Card>
          <Card title="Vazio · gráficos"><AreaChart height={80} data={[]} /><BarChart height={60} data={[]} /><PieChart size={60} data={[]} /></Card>
          <Card><MiniCalendar year={2025} month={10} today={12} marked={[13, 16, 17, 19, 26]} alert={[20]} /></Card>
        </div>
        <Demo name="DataTable · padrão, dense, vazio">
          <DataTable minWidth={520} columns={COLS} rows={ROWS} rowKey={r => r.id} onRowClick={() => {}} />
          <DataTable minWidth={520} dense columns={COLS} rows={ROWS.slice(0, 2)} rowKey={r => r.id} />
          <DataTable minWidth={520} columns={COLS} rows={[]} empty="Nenhum pedido encontrado." />
        </Demo>
        <MonthCalendar year={2025} month={10} today={1} events={[{ start: 3, end: 5, title: 'Fundação · Rota 101', sub: 'Equipe 3', color: 'var(--cp-data-pink)' }, { start: 13, end: 16, title: 'Concretagem', sub: 'Vila Nova', color: 'var(--cp-data-purple)' }, { start: 19, end: 22, title: 'Entrega de aço', sub: 'Ed. Aurora', color: 'var(--cp-data-yellow)', textColor: 'var(--text-on-bright)' }]} />
        <div style={{ maxWidth: 'var(--content-w-xs)' }}><MonthCalendar compact year={2025} month={10} today={1} events={[{ start: 13, end: 16, title: 'Concretagem', color: 'var(--cp-data-purple)' }]} /></div>
        <div style={grid(300)}>
          <Card title="Mensagens" padding={12}>
            <MessageItem name="Carlos Mendes" preview="Entrega confirmada para 7h" time="14:36" unread={3} active online />
            <MessageItem name="Ana Ribeiro" preview="Segue a medição do bloco B" time="Ontem" />
          </Card>
          <Card title="Chat" padding={12}><ChatBubble text="O concreto chega amanhã?" time="11:40" /><ChatBubble mine text="Sim, às 7h." time="11:45" /></Card>
        </div>
      </Section>

      <Section id={`${theme}-listings`} title="Listagens">
        <ListingCard title="Residencial Vila Nova · Bloco B" status="var(--status-success)" onMore={() => {}}
          attrs={[{ label: 'Prazo', value: '14 meses' }, { label: 'Local', value: 'Curitiba | PR' }, { label: 'Área', value: '4.200 m²' }]}
          featuresLabel="Etapas" features={[{ icon: 'shovel', label: 'Fundação' }, { icon: 'hammer', label: 'Alvenaria' }, { icon: 'zap', label: 'Elétrica' }]} />
        <div style={{ maxWidth: 'var(--dialog-w)' }}><ListingCard stacked title="Galpão Rota 101 (stacked)" status="var(--status-danger)" attrs={[{ label: 'Prazo', value: '8 meses' }]} /></div>
        <div style={grid(160)}>{[['Cimento CP-II 50kg', 'R$ 38'], ['Vergalhão 10mm', 'R$ 52'], ['Bloco cerâmico', 'R$ 1,20'], ['Areia média m³', 'R$ 140']].map(([t, p]) => <ProductCard key={t} title={t} price={p} onEdit={() => {}} />)}</div>
      </Section>
    </div>
  );
}

const SCREENS = [['home', 'Início'], ['obras', 'Obras'], ['nova', 'Nova obra'], ['pedidos', 'Pedidos'], ['cronograma', 'Cronograma'], ['mensagens', 'Mensagens']];

export default function Showcase() {
  const [mode, setMode] = useState<Mode>('light');
  const [screen, setScreen] = useState('home');
  const [mobileFrame, setMobileFrame] = useState(false);
  const themes: Theme[] = mode === 'both' ? ['light', 'dark'] : [mode];
  const tplTheme: Theme = mode === 'dark' ? 'dark' : 'light';
  return (
    <div data-theme={tplTheme} style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface-card)', borderBottom: 'var(--border-w) solid var(--border-default)', padding: 'var(--space-3) var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 'var(--fs-h5)' }}>Design system</strong>
        <SegmentedTabs variant="light" value={mode} onChange={v => setMode(v as Mode)} tabs={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }, { value: 'both', label: 'Lado a lado' }]} />
        <nav style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: 'var(--fs-p5-5)' }}>
          {['foundations', 'core', 'forms', 'feedback', 'navigation', 'data', 'listings'].map(s => <a key={s} href={`#${themes[0]}-${s}`}>{s}</a>)}<a href="#templates">templates</a>
        </nav>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${themes.length}, minmax(0,1fr))`, gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
        {themes.map(t => <Library key={t} theme={t} />)}
      </div>
      <div id="templates" data-theme={tplTheme} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', scrollMarginTop: 80 }}>
        <h2 style={{ margin: 0, font: 'var(--type-page-title)', fontSize: 'var(--fs-h4)' }}>Templates · admin ({tplTheme === 'dark' ? 'escuro' : 'claro'})</h2>
        <div style={row}>
          <SegmentedTabs variant="light" value={screen} onChange={setScreen} tabs={SCREENS.map(([value, l]) => ({ value, label: l }))} />
          <Checkbox label="Moldura mobile (390px)" checked={mobileFrame} onChange={setMobileFrame} />
        </div>
        <div style={{ border: 'var(--border-w) solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'auto', height: 'var(--preview-h)', width: mobileFrame ? 'var(--preview-w-phone)' : '100%', transform: 'translateZ(0)' }}>
          <AdminShell key={`${screen}-${mobileFrame}`} initialScreen={screen} forceMobile={mobileFrame} />
        </div>
      </div>
    </div>
  );
}
