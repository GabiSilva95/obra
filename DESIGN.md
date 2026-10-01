---
version: alpha
name: ConstruktPro
description: Construction-management admin UI — calm control room, light and airy with a charcoal frame and a single orange accent. The app runs the light theme; a derived dark theme is kept as an option.
colors:
  primary: "#242424"
  on-primary: "#FEFEFE"
  accent: "#F26A1B"
  on-accent: "#242424"
  accent-hover: "#D95A12"
  accent-text: "#B84A0C"
  accent-soft: "#FDE3D2"
  accent-50: "#FEF3EB"
  accent-300: "#F89A63"
  stone: "#A8A49B"
  stone-700: "#5E5A52"
  stone-100: "#EEEDEA"
  ink-900: "#1A1A1A"
  white: "#FEFEFE"
  gray-600: "#6E6E6E"
  gray-500: "#8F8F8F"
  gray-300: "#E0E0E0"
  gray-200: "#EDEDED"
  gray-100: "#F4F4F4"
  gray-50: "#FAFAFA"
  error: "#F43927"
  error-600: "#D92D1C"
  error-700: "#B42318"
  error-100: "#FDE4E1"
  success: "#1EDF00"
  success-strong: "#159912"
  success-100: "#DDF7D8"
  warning-100: "#FDF4D3"
  warning-text: "#8A6D00"
  info-100: "#DCE9F6"
  info-text: "#1F5A94"
  data-yellow: "#F2C924"
  data-orange: "#FF7F08"
  data-pink: "#FF575F"
  data-magenta: "#D70085"
  data-purple: "#9B31C8"
  data-violet: "#5917FF"
  data-turquoise: "#17E8FF"
  data-blue: "#2D77C1"
  data-electric: "#48E101"
  data-green: "#159912"
  background: "{colors.gray-50}"
  surface: "{colors.white}"
  surface-sunken: "{colors.gray-100}"
  text: "{colors.primary}"
  text-secondary: "{colors.gray-500}"
  text-muted: "{colors.gray-600}"
  border: "{colors.gray-300}"
  border-subtle: "{colors.gray-200}"
  dark-background: "#0A0A0A"
  dark-surface: "#141414"
  dark-surface-raised: "#111111"
  dark-surface-sunken: "#1C1C1C"
  dark-text: "#F0F0F0"
  dark-text-secondary: "#7A7A7A"
  dark-text-faint: "#444444"
  dark-border: "#252525"
  dark-border-subtle: "#1E1E1E"
  dark-success: "#22C55E"
  dark-danger: "#EF4444"
  dark-warning: "#FBBF24"
  dark-info: "#60A5FA"
typography:
  display:
    fontFamily: Nunito
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1.15
  headline-lg:
    fontFamily: Nunito
    fontSize: 36px
    fontWeight: 800
    lineHeight: 1.15
  page-title:
    fontFamily: Nunito
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
  headline-sm:
    fontFamily: Nunito
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  card-title:
    fontFamily: Nunito
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  stat:
    fontFamily: Nunito
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1
  body-lg:
    fontFamily: Nunito
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  body-md:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: Nunito
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
  micro:
    fontFamily: Nunito
    fontSize: 10px
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 999px
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "24": 96px
  gutter: 24px
  offset: 32px
  sidebar: 280px
  sidebar-collapsed: 88px
  header: 72px
  mobile-tabbar: 68px
  control-sm: 32px
  control-md: 40px
  control-lg: 48px
  content-xs: 420px
  content-sm: 560px
  content-md: 820px
  content-lg: 900px
  content-xl: 1160px
  modal: 500px
  modal-wide: 760px
  dialog: 380px
  popover: 340px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.ink-900}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    height: 40px
  button-accent-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.gray-100}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    height: 40px
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 20px
  sidebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    width: 280px
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  table-header:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
  tag-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.data-yellow}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xs}"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.lg}"
  banner-warning:
    backgroundColor: "{colors.warning-100}"
    textColor: "{colors.warning-text}"
    rounded: "{rounded.md}"
  banner-info:
    backgroundColor: "{colors.info-100}"
    textColor: "{colors.info-text}"
    rounded: "{rounded.md}"
  banner-success:
    backgroundColor: "{colors.success-100}"
    textColor: "{colors.success-strong}"
    rounded: "{rounded.md}"
  banner-danger:
    backgroundColor: "{colors.error-100}"
    textColor: "{colors.error-700}"
    rounded: "{rounded.md}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    width: 500px
  alert-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    width: 380px
---

# ConstruktPro design system

Visual contract and token source of truth for this repository. Tokens in the front matter are mirrored as CSS custom properties in `design-system/tokens/*.css`; change them here first, then in the CSS. Components live in `design-system/` (see `AGENTS.md` for the library map and rules).

## Overview

ConstruktPro — "Do canteiro ao escritório" — is a construction-management platform. The system defines its **admin dashboard**: modern, clean, desktop-first, and fully usable on mobile (drawer navigation + bottom tab bar) without dropping desktop capability. The vibe is a **calm control room**: clear hierarchy, few words, data first.

**Brand.** The product is ConstruktPro everywhere: browser title, sidebar (`logo-negativo.svg`), login, sign-up and landing (`logo-positivo.svg`).

**Themes.** Two themes ship as `[data-theme]` scopes:
- **Light** (canonical, `:root`) — the ConstruktPro look described in this document. **The app runs light**: `index.html` sets `data-theme="light"` on `<html>`.
- **Dark** (`[data-theme="dark"]`) — optional, derived from the pre-migration dark palette (`dark-*` colors above). No screen uses it today; it is kept so the showcase at `/showcase` can render both themes and a future toggle stays cheap. Every new component must still look right in both.

### Content & voice
- **Language:** Brazilian Portuguese. UI copy is short, noun-first, operational: "Obras ativas", "Entregas na semana", "Pedidos de material", "Nova anotação".
- **Casing:** sentence case for titles, buttons and labels ("Nova obra", "Próxima etapa", "Ver tudo"). Status labels too ("Pago 100%", "Em trânsito").
- **Voice:** neutral and direct; imperatives on buttons ("Enviar fotos", "Salvar anotação"). No "nós"/"eu", no exclamation marks in UI. Questions only as form section prompts ("O que está incluído no valor?").
- **Labels:** attribute labels end with a colon ("Prazo:", "Local:") and sit above the value in secondary gray.
- **Numbers:** Brazilian format — "R$ 4.250,00", "12.500 m²", dates "26 nov", times "14:36". Short money in KPIs ("R$ 342k").
- **Emoji:** never in product UI. Unicode only for "•" online dot and "·" separators.

### Sources
- `design-system/assets/logo-negativo.svg` — the only brand asset supplied (white + orange #F26A1B + stone #A8A49B wordmark with tagline). `logo-positivo.svg` is the same file with white swapped to #242424 for light backgrounds.
- Structural/visual reference: a Behance-style case study of **Buyur** (multi-service admin dashboard, 2025–26; designed by Ilaha Alieva, Gunel Babayeva, Mujgan Jabiyeva, Nazrin Mahmudlu) — palette structure, Nunito type scale, grid, sidebar/header/card/table/form/calendar anatomy. Buyur's brand (name, lime/green, mark) is *not* used; its green/lime roles are remapped to ConstruktPro orange. The screenshots were not kept in the repo (third-party material).
- No codebase, Figma or font files were supplied to the original export. Values were read from screenshots; exact pixel values are approximations.

## Colors

- **Background & surfaces:** light, airy app (`background` #FAFAFA, cards #FEFEFE) framed by a solid charcoal #242424 sidebar. Sunken fills use gray-100.
- **Accent — orange #F26A1B is the single accent:** active nav pill, chart fills, marked calendar days, outgoing chat bubbles, focus rings. Text on orange is always #242424 (white fails contrast). Orange 700 #B84A0C for accent text on white.
- **Stone #A8A49B** for placeholders and imagery neutrals.
- **Feedback:** error #F43927, success #159912 (strong) / #1EDF00 (electric), warning soft #FDF4D3 with text #8A6D00, info soft #DCE9F6 with text #1F5A94. Each status has a solid (`--status-*`), a soft fill (`--status-*-soft`) and, for warning/info, a readable text colour (`--status-*-text`) used by `Banner` and notification tiles. Error red sits close to brand orange — always pair error with an icon or text, never colour alone.
- **Dashboard data colours** (yellow, orange, pink, magenta, purple, violet, turquoise, blue, electric, green) are **only for data**: KPI numerals (`--stat-1..4` = blue → yellow → green → orange), event bars, status badges, chart series.
- **Semantic tokens.** Product code uses semantic CSS variables, never primitives: `--bg-app`, `--surface-*`, `--text-*`, `--accent*`, `--action-*`, `--border-*`, `--status-*`. Each theme redefines them; primitives (`--cp-*`) stay constant.
- **Dark theme:** background #0A0A0A, surfaces #141414 / #111111 / #1C1C1C, text #F0F0F0 / #7A7A7A / #444444, borders #252525 / #1E1E1E, status green #22C55E, red #EF4444, yellow #FBBF24, blue #60A5FA. Accent stays #F26A1B.

## Typography

- **Nunito throughout** (rounded sans, weights 500–800), self-hosted from `design-system/assets/fonts` (latin + latin-ext, variable 200–1000). Fallback stack `ui-rounded, 'Segoe UI', system-ui, sans-serif`.
- **Headers:** 56 / 36 / 28 / 24 / 18 / 16, Extra Bold → Semi Bold. **Paragraphs:** 24 / 20 / 18 / 16 / 14 / 12, Medium / Semi Bold.
- **Roles:** page titles 28 Bold (`--type-page-title`), card titles 20 Semi Bold (`--type-card-title`), KPI numerals 30 Semi Bold in a data colour (`--type-stat`), body 14 Medium (`--type-body`), labels 12 Semi Bold (`--type-label`).

## Layout

- **Desktop:** fixed left sidebar (280px, 88px collapsed, 32px offset, 24px gutter) + flexible main grid (6 cols × 160, 24 gutter). Page = header (title + actions, hairline bottom border, 72px) then a 24px-gapped widget grid. Dashboard: 4 KPI tiles → 2/3 charts column + 1/3 calendar/messages column.
- **Below 900px:** one column, 16px margins, 12px gaps, KPI tiles 2-up, sticky compact header, bottom `MobileTabBar` (68px), sidebar as a drawer over a blurred scrim.
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 (`--space-1` … `--space-12`), with 2 / 6 / 10 / 14 half-steps for dense UI. The same 4px scale continues for **sizing** (icon boxes, avatars, fixed table columns): 18 / 22 / 26 / 28 / 30 / 34 / 36 / 38 / 44 / 56 / 64 / 96 (`--space-4-5` … `--space-24`; the name is the px value ÷ 4). Controls are 28 / 32 / 40 / 48px tall (`--control-h-*`).
- **Layout widths:** content columns `--content-w-xs` 420 (auth cards) · `-sm` 560 (lead paragraphs) · `-md` 820 (FAQ) · `-lg` 900 (plan picker) · `-xl` 1160 (landing sections); `--modal-w` 500 / `--modal-w-wide` 760; `--dialog-w` 380; `--popover-width` 340; `--search-w` 360; filter selects `--control-w-sm` 140 / `--control-w-md` 200; grid minimums `--col-min-xs/sm/md/lg` 120 / 160 / 240 / 300; scroll areas `--scroll-h-sm/md` 220 / 380; logos `--logo-w` 220 / `--logo-w-sm` 180.
- **Stacking:** `--z-sticky` 5 (mobile header) < `--z-tabbar` 6 < `--z-drawer` 10 < `--z-nav` 50 (landing nav) < `--z-modal` 60 < `--z-popover` 99 < `--z-dialog` 2000 (alerts above everything).
- **Borders:** `--border-w` 1px hairline, `--border-w-strong` 1.5px, `--border-w-thick` 2px.

## Elevation & Depth

- Only three levels: **card** `0 4px 24px rgba(36,36,36,.05)`, **raised** `0 8px 32px rgba(36,36,36,.08)`, **pop** `0 12px 40px rgba(36,36,36,.14)`. The dark theme uses black-based equivalents plus a 1px `--border-card` so surfaces stay legible.
- The one expressive effect is the **orange glow** on the active nav item (`0 0 18px rgba(242,106,27,.45)`).
- **Backgrounds:** flat colour only. No gradients except the chart area fill (orange → transparent). No textures or patterns; photo placeholders use a subtle stone stripe.
- **Transparency/blur:** only the mobile drawer / modal scrim (48% charcoal + 4px blur in light).
- **Motion:** quick and quiet — 120ms hover, 200ms state, 320ms sidebar collapse; easing `cubic-bezier(.2,.7,.2,1)`. No bounces. **Hover:** light fill shift (gray-100 on light, white 5–6% on dark), table rows tint orange-50, buttons darken one step. **Press:** scale .98. **Focus:** orange border + 3px orange 25% ring.

## Shapes

- 4px badges / inputs / checkboxes · 8px buttons · 12px nav pill & chat bubbles · 16px cards & sidebar · 24px frames · pill for chips / filters · circles for calendar days & avatars.
- **Borders:** hairline #E0E0E0 for inputs, table rows, header divider, calendar grid. Tables have a solid black header row.
- **Imagery:** real site photography (obras, materials) in rounded 8px frames; neutral/warm, natural light. Placeholders in the kit.

## Components

The library lives in `design-system/components` (37 components) and `design-system/templates` (admin shell + 5 screens); per-component usage notes are in `design-system/guidelines/components.md`.

- **Buttons:** dark `primary` is the default CTA; `accent` (orange) is reserved for one hero action per view; `secondary`, `ghost`, `link`, `danger`. Sizes 32 / 40 / 48, radius 8, `loading` shows a spinner and blocks clicks.
- **Cards:** surface fill, 16px radius, no border in light (1px in dark), `--shadow-card`, 20px padding; clickable cards get an orange border on hover/selection.
- **Inputs / Select / Textarea:** 40px, 4px radius, hairline border; focus = orange border + ring; error = red border + red helper with icon; disabled = sunken fill.
- **Status:** `Badge` = solid rectangle, 4px radius, white text (black on yellow / turquoise / electric green) for workflow state; `Tag` = soft pill for classification, filters (with count) and legends.
- **Navigation:** charcoal rounded `Sidebar` with glowing orange active pill; `Header` with title, icon actions and user block; `SegmentedTabs` dark or light; `Stepper` for wizards; `MobileTabBar` below 900px.
- **Data:** `StatCard` KPI tiles, `DataTable` with solid header and orange row hover (card list on mobile), `ProgressBar` (budget/stock usage, auto-coloured by threshold), `AreaChart`, `BarChart`, `PieChart`, `MiniCalendar`, `MonthCalendar`, `MessageItem`, `ChatBubble`.
- **Forms (extra):** `MoneyInput` (BRL mask, "R$" prefix, parses to number), `UploadBox` (drag-and-drop or click, `busy`/`disabled`), `Checkbox`, `OptionRow`, `FilterPill`.
- **Overlays:** `Modal` — card over a blurred scrim, 500px (760px `wide`), sticky footer for actions, becomes a bottom sheet below 640px, Esc/scrim close. `AlertDialog` — compact notice/confirmation with a tone icon (info / success / warning / error), one or two buttons, `danger` turns the confirm button red.
- **Feedback:** `Banner` — inline soft-tinted notice (info / success / warning / danger / accent) with icon, title, message and optional action.

### Iconography
- Thin outline set, 1.5px stroke, rounded caps — **Lucide** — at 20px in nav/body, 16px in dense tables, 24px in headers. 80 SVGs in `design-system/assets/icons`, inlined in `components/core/iconData.ts` for the `Icon` component. Add more by copying from `lucide-static`.
- Icons are always monochrome `currentColor`; filled icon tiles (white glyph on a 12px-radius orange/charcoal square) are used for section headers.
- No emoji, no icon font, no PNG icons. No flags — the language menu uses text labels.

## Do's and Don'ts

- Do use semantic tokens (`var(--surface-card)`, `var(--space-4)`, `var(--radius-lg)`, `var(--fw-semibold)`, `var(--z-modal)`) — never raw hex, px or bare numbers for spacing / size / radius / font size / weight / z-index, or font names, in product code or in the components themselves.
- Do build new UI from `design-system` components; extend a component (typed prop + showcase entry) before writing a one-off.
- Do keep one orange accent action per view; data colours only for data.
- Do pair error red with an icon or text — it sits close to brand orange.
- Don't put white text on orange; use `--text-on-accent`.
- Don't add gradients, textures or extra shadow levels; don't use emoji in UI.
- Don't mix Nunito with other families.
