# AGENTS.md

Instructions for coding agents working in this repository. Project overview, API routes and deploy steps are in `README.md`.

## Project

ConstruktPro — multi-tenant SaaS for construction management. React 18 + Vite 5 (frontend, `src/`), Express 5 + Prisma 7 on Neon Postgres (backend, `server/`), deployed on Vercel. UI copy is Brazilian Portuguese.

## Commands

- `npm run dev` — API on :3002 + Vite on :3000 (proxy `/api`)
- `npm run build` — production build
- `npm run typecheck` — TypeScript check of `design-system/`
- `npm run lint` — oxlint, including the design-system adherence rules
- `npm run lint:design` — validates `DESIGN.md` (Google Labs `design.md` linter)

## Design system — rules

- **`DESIGN.md` (repo root) is the visual contract and the source of truth for tokens.** To change a colour, font, spacing or radius, edit `DESIGN.md` first, then mirror it in `design-system/tokens/*.css`, then run `npm run lint:design`.
- **New UI is built from the library in `design-system/`.** Import from the barrel: `import { Button, Card } from "<relative>/design-system"` — never from component internals (lint enforces).
- **No hardcoded colour, font, spacing, size, radius, weight or z-index values** — in product code and inside the components. Use semantic CSS variables: `var(--surface-card)`, `var(--text-secondary)`, `var(--accent)`, `var(--space-4)`, `var(--radius-lg)`, `var(--fs-p5)`, `var(--fw-semibold)`, `var(--content-w-xs)`, `var(--z-modal)`, `var(--font-sans)`. Never primitives (`--cp-*`) outside `design-system/`, never raw hex or `px` strings, never bare numbers for these properties, never another font family. `npm run lint` reports hex / `px` / font violations as `ds(restricted-syntax)` warnings; bare numbers (`fontWeight: 600`, `width: 96`) are not caught by lint, so check them in review. Numeric props of components (`<Icon size={16} />`, `<Sidebar height={520} />`) are component API, not style, and are fine.
- **Themes:** light (`:root`, `[data-theme="light"]`) and dark (`[data-theme="dark"]`). **The app runs light** (`index.html` sets `data-theme="light"` on `<html>`); dark is optional and only rendered in `/showcase`. Any colour you add must still exist in both theme blocks of `tokens/colors.css`.
- **Brand:** ConstruktPro. Use `design-system/assets/logo-negativo.svg` on charcoal (sidebar, landing footer) and `logo-positivo.svg` on light surfaces (login, sign-up, landing nav). Never write the name as styled text in place of the logo.
- **All screens are on the design system.** The legacy layer (`src/components/ui/`, `src/constants/tokens.js`, `BottomNav`) was removed — do not recreate it.
- **App shell and page actions.** `src/App.jsx` renders the single DS `Header` (title from `MENU` in `src/components/Sidebar.jsx`), the `Sidebar` on desktop and `MobileTabBar` + drawer below 900px. Pages do **not** render their own header: they put their buttons/filters in `<PageActions>…</PageActions>` (`src/components/PageActions.jsx`), which portals them into the Header's actions slot (below the header on mobile). Page subtitle/description goes at the top of the page body.
- **Forms in modals** use `Modal` with the action buttons in its `footer`; saving buttons use `loading={salvando}` to block double submits. Notices and confirmations go through `src/utils/aviso.js` (`avisarSucesso`, `avisarErro`, `confirmar`…), which renders the DS `AlertDialog` — never `window.alert/confirm`.
- **Responsive switches** use `useIsMobile()` / `useMediaQuery()` from the design system, not ad-hoc `window.innerWidth` listeners.

## Design system — library map

| Path | Contents |
| --- | --- |
| `design-system/index.ts` | Barrel: every component and its prop types |
| `design-system/styles.css` | Entry CSS (imported once in `src/main.jsx`) → `tokens/` |
| `design-system/tokens/` | `colors.css` (primitives + light/dark semantic), `typography.css`, `spacing.css` (space/size scale, radius, border widths, control heights, layout widths, z-index), `effects.css` (shadows, motion, scrim), `fonts.css` (Nunito @font-face), `base.css` |
| `design-system/components/core/` | `Icon` (+ `iconData.ts`, 80 Lucide glyphs), `Button` (+ `Spinner`), `IconButton`, `Badge`, `Tag`, `Avatar` |
| `design-system/components/forms/` | `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `OptionRow`, `FilterPill`, `UploadBox`, `MoneyInput` (+ `formatarMoeda`, `parseMoeda`) |
| `design-system/components/navigation/` | `Sidebar`, `Header`, `MobileTabBar`, `SegmentedTabs`, `Stepper` |
| `design-system/components/data/` | `Card`, `StatCard`, `DataTable`, `ProgressBar`, `AreaChart`, `BarChart`, `PieChart`, `MiniCalendar`, `MonthCalendar`, `MessageItem`, `ChatBubble` |
| `design-system/components/listings/` | `ListingCard`, `ProductCard`, `Photo` |
| `design-system/components/overlays/` | `Modal` (bottom sheet below 640px), `AlertDialog` |
| `design-system/components/feedback/` | `Banner` |
| `design-system/hooks/` | `useMediaQuery`, `useIsMobile` |
| `design-system/templates/` | Composition patterns: `AdminShell` (sidebar + header + mobile tab bar/drawer) and screens `HomeScreen`, `ObrasScreen`, `PedidosScreen`, `CronogramaScreen`, `MensagensScreen` |
| `design-system/guidelines/components.md` | Usage notes for every component |
| `design-system/assets/` | `fonts/` (Nunito woff2), `icons/` (Lucide SVGs), `logo-negativo.svg`, `logo-positivo.svg` |
| `design-system/showcase/Showcase.tsx` | Route `/showcase`: whole library, all states, light / dark / side by side, templates |
| `design-system/lint/adherence-plugin.js` | oxlint JS plugin used by `.oxlintrc.json` for the adherence rules |
| `design-system/reference/` | Original HTML visual references (specimen cards, component cards, clickable admin UI kit). Open the `.html` files straight in a browser; they use `design-system/styles.css` + `assets/` and a vendored `_ds_bundle.js` (plus React/Babel from unpkg). Reference only — not imported by the app |

## Design system — adding a component

1. Create `design-system/components/<group>/<Name>.tsx`: a named export plus an exported `<Name>Props` interface with a one-line doc comment. Style only with semantic `var(--…)` tokens; cover the states that apply (hover, active, focus-visible, disabled, loading, error, empty, selected) and keep it working in both themes.
2. Export it (and its props type) from `design-system/index.ts`.
3. Add it with every variant and state to `design-system/showcase/Showcase.tsx`.
4. Add a usage note to `design-system/guidelines/components.md`; add a prop allow-list entry for it in `.oxlintrc.json` (`ds/restricted-syntax`).
5. If it needs a new token, add it to `DESIGN.md` and to both themes in `tokens/`.
6. Run `npm run typecheck && npm run lint && npm run build` and check `/showcase` in the browser.
