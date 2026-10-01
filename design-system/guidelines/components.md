# Component usage guidelines

Usage notes for every component in `design-system/components`, carried over from the original Claude Design export (`*.prompt.md`). Props and types live in each `.tsx` file; visual rules live in `DESIGN.md`. See every state live at `/showcase`.

## Core

### Avatar

Round user photo with initials fallback on light gray; used in header, message list and tables.
```jsx
<Avatar name="Marina Costa" size={40} online />
```

### Badge

Solid, 4px-radius status label — one colour per workflow state (Novo pedido, Em trânsito, Pago 100%, Falhou…).
```jsx
<Badge tone="success">Pago 100%</Badge>
<Badge tone="warning">Pendente</Badge>
```
Map states consistently: new=danger(pink) · waiting=warning · in progress=info/cyan · done=success · failed=error · refunded=info.

### Button

Action button; dark `primary` is the default CTA, `accent` (orange) is reserved for one hero action per view.
```jsx
<Button iconLeft="plus">Nova obra</Button>
<Button variant="secondary" iconLeft="chevron-left">Voltar</Button>
```
Variants: primary · accent · secondary · ghost · link · danger. Sizes sm 32 / md 40 / lg 48. Radius 8. Press = scale .98.

### Icon

Outline icon (Lucide, 1.5 stroke) — use for every glyph in nav, headers, attributes and buttons.
```jsx
<Icon name="hard-hat" size={20} />
```
Names available: see `assets/icons/`. Inherits `currentColor`. Use 20px in nav/body, 16px in dense tables, 24px in headers.

### IconButton

Icon-only button for header actions, table row actions and calendar paging.
```jsx
<IconButton icon="bell" label="Notificações" badge={3} />
<IconButton icon="trash-2" variant="danger" size={28} label="Excluir" />
```
Variants: ghost · outline · dark · danger · inverse (on dark sidebar). `round` for calendar arrows.

### Tag

Soft pill for categories (table "Categoria" column), filter chips with counts, and chart legends.
```jsx
<Tag>Estrutural</Tag>
<Tag tone="neutral" count={4} active>Todos</Tag>
```
Use Badge (solid, square) for workflow status; Tag (soft, pill) for classification.

## Forms

### Checkbox

Square 18px checkbox — black fill with white check when on.
```jsx
<Checkbox label="Aceito os termos" defaultChecked />
```

### FilterPill

Outline pill dropdown sitting top-right of a chart card to change the period.
```jsx
<FilterPill options={['Últimos 6 meses','Último ano']} />
```

### Input

Labelled text field with ⓘ info, helper line, error state, password toggle and prefix slot.
```jsx
<Input label="Valor por m²" required prefix="R$" placeholder="0,00" helper="Sem impostos" />
<Input label="Senha" type="password" />
```
States: default · focus (orange border + ring) · disabled (gray fill) · error (red border + red helper). 40px tall, 4px radius.

### MoneyInput

Input for BRL amounts: "R$" prefix, types as cents ("1234" → "12,34"), emits a number (or `''` when empty).
```jsx
<MoneyInput label="Valor unit." value={item.valor} onChange={e => set({ valor: e.target.value })} />
```
`formatarMoeda(n)` and `parseMoeda(s)` are exported for read-only cells.

### OptionRow

Icon + label + trailing checkbox; lay out 3-up in a grid for category pickers.
```jsx
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',columnGap:48}}>
  <OptionRow icon="hammer" label="Alvenaria" defaultChecked />
</div>
```

### Select

Labelled dropdown matching Input geometry.
```jsx
<Select label="Tipo de obra" placeholder="Selecione" options={['Residencial','Comercial','Industrial']} />
```

### Textarea

Multi-line field with live "n/500" counter bottom-right.
```jsx
<Textarea label="Observações" placeholder="Detalhes para a equipe" maxLength={500} />
```

### UploadBox

Dashed drop zone on sunken gray; turns orange-tinted on hover.
```jsx
<UploadBox title="Enviar fotos" formats="JPG, PNG até 5 MB" />
<UploadBox title="Importar XML da NF-e" accept=".xml" onFiles={importar} busy={lendo} />
```
Drag-and-drop or click; `onFiles` receives `File[]`. `busy` shows a spinner and blocks input; `disabled` greys it out.

## Navigation

### Header

Top of every page — 28/700 title, icon actions, divider, avatar + name + role.
```jsx
<Header title="Início" user={{name:'Marina Costa', role:'Admin'}} notifications={3} />
```
Variants: search="icon" | "field" | "none". Mobile: pass `onMenu` + `compact`.
`notificationsSlot` replaces the built-in bell (the app passes its `Notificacoes` dropdown); `actions` holds page buttons — in this app pages fill it through `<PageActions>` instead of passing it directly.

### MobileTabBar

Mobile bottom navigation (intentional addition — reference kit is desktop-only). Dark bar, orange glowing pill on the active icon; the last item is usually "Menu" to open the full Sidebar drawer.
```jsx
<MobileTabBar activeId="home" items={[{id:'home',label:'Início',icon:'layout-grid'},{id:'menu',label:'Menu',icon:'menu'}]} />
```

### SegmentedTabs

Category switcher above grids and lists.
```jsx
<SegmentedTabs tabs={['Todas','Residencial','Comercial','Industrial']} />
<SegmentedTabs variant="light" tabs={[{value:'all',label:'Todas',count:8}]} />
```

### Sidebar

Primary app navigation: #242424 rounded panel, white items, active item = orange pill with soft glow.
```jsx
<Sidebar logoSrc="assets/logo-negativo.svg" activeId="home" onSelect={setPage} onToggle={() => setCollapsed(c=>!c)}
  items={[{id:'home',label:'Início',icon:'layout-grid'},{id:'obras',label:'Obras',icon:'building-2',children:[{id:'ativas',label:'Ativas'}]}]}
  footerItems={[{id:'settings',label:'Configurações',icon:'settings'},{id:'logout',label:'Sair',icon:'log-out'}]} />
```
280px expanded · 88px collapsed · full-height drawer on mobile via `onClose`.

### Stepper

Horizontal wizard progress: black filled line + check dots for done, outlined number for current, gray for next.
```jsx
<Stepper steps={4} current={2} />
```

## Data

### AreaChart

Revenue/trend line — smooth curve, orange→transparent fill, dark value tooltip on hover.
```jsx
<AreaChart data={[120,240,180,420,260,380]} labels={['Jun','Jul','Ago','Set','Out','Nov']} highlight={3} format={v=>'R$ '+v+'k'} />
```

### BarChart

Paired bars comparing two series per period; top-rounded 6px.
```jsx
<BarChart series={[{key:'prev',label:'Previsto',color:'var(--accent)'},{key:'real',label:'Realizado',color:'var(--cp-black)'}]} data={[{label:'Seg',prev:220,real:120}]} />
```

### Card

Base content panel — every dashboard widget sits in one (16px radius, --shadow-card, 20px padding).
```jsx
<Card title="Receita" action={<FilterPill options={['Últimos 6 meses']} />}>…</Card>
```

### ChatBubble

Message bubble in the chat pane; outgoing = orange with black text, incoming = light gray.
```jsx
<ChatBubble mine text="Entrega confirmada para 7h." time="Qui 11:45" />
```

### DataTable

Records table — black header, hairline row dividers, orange-tint row hover; wrap cells with Badge/Tag/IconButton.
```jsx
<DataTable columns={[{key:'id',label:'Pedido'},{key:'status',label:'Status',render:r=><Badge tone="success">{r.status}</Badge>}]} rows={rows} />
```
On mobile prefer a card list; the table scrolls horizontally as a fallback.

### MessageItem

Row in Recent Messages / inbox lists; active row gets gray fill + orange inset bar.
```jsx
<MessageItem name="Carlos Mendes" preview="Olá! Gostaria de confirmar a entrega…" time="14:36" unread={3} />
```

### MiniCalendar

Compact month grid for the dashboard side column. Past days are struck-through gray.
```jsx
<MiniCalendar year={2025} month={10} today={12} marked={[13,16,17,19,26]} alert={[20]} />
```

### MonthCalendar

Schedule page grid — hairline cells, pill event bars spanning days in dashboard data colours with a ↘ open affordance.
```jsx
<MonthCalendar year={2025} month={10} today={1} events={[{start:13,end:16,title:'Concretagem',sub:'Bloco B',color:'var(--cp-data-purple)'}]} />
```

### PieChart

Market-share style breakdown using dashboard data colours.
```jsx
<PieChart data={[{label:'Residencial',value:42,color:'var(--cp-data-blue)'},{label:'Comercial',value:33,color:'var(--cp-data-yellow)'}]} />
```

### ProgressBar

Thin pill bar for budget, stock or stage progress. Colour is automatic (info → accent above 70% → success at 100%) unless `color` is set.
```jsx
<ProgressBar value={pct} label="Orçamento utilizado" />
<ProgressBar value={72} color="var(--status-danger)" height={8} />
```

### StatCard

KPI tile — coloured 30px numeral over a 15px label; lay out 4-up.
```jsx
<StatCard value="24" label="Obras ativas" color="var(--stat-1)" />
```
Order: blue → yellow → green → orange (money values last, with "R$").

## Listings

### ListingCard

Primary list item for inventory-type pages (obras, equipamentos, unidades). Stack vertically with 12px gaps.
```jsx
<ListingCard title="Residencial Vila Nova, Bloco B" status="var(--cp-success-strong)"
  attrs={[{label:'Prazo',value:'14 meses'},{label:'Local',value:'Curitiba | PR'}]}
  featuresLabel="Etapas" features={[{icon:'shovel',label:'Fundação'},{icon:'hammer',label:'Alvenaria'}]} onMore={()=>{}} />
```
`stacked` on mobile.

### ProductCard

Catalogue tile for materials / items; grid 4-up desktop, 2-up mobile.
```jsx
<ProductCard title="Cimento CP-II 50kg" price="R$ 38" onEdit={()=>{}} />
```

## Overlays

### Modal

Form or detail dialog over a blurred scrim. 500px card (`wide` → 760px), scrollable body, sticky `footer` for actions; bottom sheet below 640px. Esc and scrim click call `onClose`.
```jsx
<Modal title="Nova alocação" onClose={fechar}
  footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button iconLeft="check" loading={salvando} onClick={salvar}>Lançar</Button></>}>
  …fields…
</Modal>
```

### AlertDialog

Compact notice or confirmation with a tone icon. Without `cancelLabel` it is a single-button notice; with it, a confirmation. `danger` makes the confirm button red. In the app, call `avisarSucesso` / `avisarErro` / `confirmar` from `src/utils/aviso.js` instead of rendering it.
```jsx
<AlertDialog tone="warning" title="Excluir obra?" message="Esta ação não pode ser desfeita."
  confirmLabel="Excluir" cancelLabel="Cancelar" danger onConfirm={excluir} onCancel={fechar} />
```

## Feedback

### Banner

Inline soft-tinted notice inside a page or modal: icon + optional title + message + optional action.
```jsx
<Banner tone="danger" title="3 etapas atrasadas">Etapas fora do prazo previsto.</Banner>
<Banner tone="warning" action={<Button size="sm">Fazer upgrade</Button>}>Limite de usuários atingido.</Banner>
```
Tones: info · success · warning · danger · accent.

## Hooks

- `useMediaQuery(query)` — boolean for a CSS media query, updates on change.
- `useIsMobile()` — `true` below 900px (the sidebar/tab-bar breakpoint).

## Additions in this repository

- `Button` — `loading` state (spinner, `aria-busy`, blocks clicks) for save actions.
- `Card` — `onClick` + `selected` (hover/selected orange border, keyboard-focusable), merged from the app's previous Card.
- `DataTable` — `empty` content when there are no rows.
- `Input` / `Select` / `Textarea` — forward native attributes (`name`, `min`, `step`, `onKeyDown`, `autoFocus`…); `Select` also accepts `<option>` children; `Textarea` accepts `maxLength={null}` (no limit, no counter).
- `Sidebar` — `brand` (text wordmark when there is no logo) and `footer` slot (user / tenant block).
- `Field` and `Photo` — previously duplicated internals of Input/Select/Textarea and ListingCard/ProductCard, now shared and exported.
- Charts (`AreaChart`, `BarChart`, `PieChart`) render an empty state when `data` is empty.
- New for the app migration: `Modal`, `AlertDialog`, `Banner`, `MoneyInput`, `ProgressBar`, `useMediaQuery` / `useIsMobile`; `UploadBox` gained `onFiles` / `accept` / `multiple` / `busy` / `disabled`; `Header` gained `notificationsSlot`.
- Every component is styled only with tokens (no px, hex or bare numbers), including sizes, weights and z-index.
