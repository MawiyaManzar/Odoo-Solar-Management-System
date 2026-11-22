---
name: SunPower dual-surface
description: Staff HackCore ops theme plus Multiplane Cel Dawn public landing
colors:
  staff-page: "#fafafa"
  staff-card: "#fffdf8"
  staff-section: "#ffffff"
  staff-line: "#d9d0c1"
  staff-line-strong: "#b8ad9a"
  staff-ink: "#2b2430"
  staff-ink-muted: "#6b6372"
  staff-brand: "#714b67"
  staff-brand-hover: "#5c3c54"
  staff-brand-press: "#4a3044"
  staff-brand-tint: "#f1e7ee"
  staff-on-brand: "#fffdf8"
  staff-accent: "#017e84"
  staff-accent-text: "#01666b"
  staff-accent-tint: "#dff1f1"
  staff-success: "#10b981"
  staff-success-bg: "#dcfce7"
  staff-success-text: "#14532d"
  staff-warning: "#f59e0b"
  staff-warning-bg: "#fef9c3"
  staff-warning-text: "#713f12"
  staff-danger: "#f43f5e"
  staff-danger-bg: "#fee2e2"
  staff-danger-text: "#7f1d1d"
  landing-haze: "#f7f4ec"
  landing-sheet: "#fffdf8"
  landing-mist: "#d9e4ea"
  landing-fern: "#6b8f71"
  landing-fern-deep: "#3f5a45"
  landing-pine: "#1e3a2e"
  landing-ink: "#2b2430"
  landing-muted: "#5a5160"
  landing-lamp: "#c4a35a"
  landing-lamp-hot: "#f2b24a"
typography:
  staff-body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  staff-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
  staff-mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
  landing-display:
    fontFamily: "Spectral, Times New Roman, serif"
    fontSize: "clamp(40px, 6vw, 64px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  landing-headline:
    fontFamily: "Spectral, Times New Roman, serif"
    fontSize: "clamp(28px, 3.5vw, 36px)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  landing-body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  landing-label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  staff-btn: "4px"
  staff-input: "4px"
  staff-card: "6px"
  staff-badge: "999px"
  landing-sharp: "0px"
spacing:
  staff-gutter: "16px"
  staff-space-2: "8px"
  staff-space-3: "12px"
  staff-space-4: "16px"
  landing-gutter: "clamp(20px, 4vw, 48px)"
  landing-section-y: "clamp(40px, 6vw, 72px)"
components:
  staff-button-primary:
    backgroundColor: "{colors.staff-brand}"
    textColor: "{colors.staff-on-brand}"
    rounded: "{rounded.staff-btn}"
    padding: "9px 16px"
    typography: "{typography.staff-body}"
  staff-button-primary-hover:
    backgroundColor: "{colors.staff-brand-hover}"
    textColor: "{colors.staff-on-brand}"
  landing-lamp:
    backgroundColor: "{colors.landing-lamp-hot}"
    textColor: "{colors.landing-ink}"
    rounded: "{rounded.landing-sharp}"
    padding: "16px 22px"
    typography: "{typography.landing-body}"
  landing-lamp-hover:
    backgroundColor: "{colors.landing-lamp}"
    textColor: "{colors.landing-ink}"
---

# Design System: SunPower (dual surface)

## Overview

**Creative North Star: "Two doors, two worlds"**

SunPower ships two visual surfaces that must never be mixed casually. Staff and auth live in **HackCore** — a flat, warm Odoo-style back office of beige canvas, muted plum actions, and teal links. The public route `/` lives in **Multiplane Cel Dawn** — an off-white dawn haze cel with painted plane plates, Spectral title-card type, Manrope nearest-plane UI, and a lamp-amber Book consultation window as the only warm light.

**Surface A — Staff / ops / auth** (`/app`, login, signup, pipeline screens). Tokens: `src/styles/tokens.css`. Shared UI: `src/components/ui/`. Flat hairlines, no shadows, no CSS gradients, no emoji in the DOM. Plum is the action colour; teal is links and focus; status colours are only for status.

**Surface B — Public landing** (`/`). Styles scoped under `.landing-page` in `src/features/landing/landing.css`. Painted multiplane plates in `public/landing/planes/`, hero photograph `public/landing/hero-bg.jpg`, pine footer, mobile sticky bottom bar. Landing tokens are `--lp-*` locals on `.landing-page` — they do not rewrite `:root` HackCore tokens.

**The Two-Surface Rule.** Staff chrome (plum buttons, Inter UI, flat no-shadow) never appears as the marketing look on `/`. Landing lamp amber, Spectral display, fern/pine accents, and plane plates never become the staff app theme. Auth and ops stay HackCore.

**Key Characteristics:**

- Dual surface: HackCore for work; Multiplane Cel Dawn for persuade
- Staff: full-bleed lists, 1px hairlines, plum primary, teal focus
- Landing: dawn haze ground, layered painted planes, lamp CTA, pine footer
- Shared product truth (live packages API, survey-before-quote) — not shared chrome
- No emoji in either surface's rendered UI

---

## Colors

### Staff / ops (HackCore)

Quiet warm beige with one plum action voice and teal for navigation of attention (links, focus, info). Change hex only in `tokens.css` palette section A; screens use meaning tokens in section B.

#### Primary (plum brand)

- **Muted Plum** (`#714b67` / `--brand`): main buttons, logo emphasis, active tab underline.
- **Plum Hover / Press** (`#5c3c54` / `#4a3044`): darker button states.
- **Plum Tint / Line** (`#f1e7ee` / `#c9aebf`): light plum tiles and borders.
- **On Brand** (`#fffdf8`): text on plum fills.

#### Secondary (teal accent)

- **Ops Teal** (`#017e84` / `--accent`): focus ring.
- **Teal Text** (`#01666b`): links and info copy.
- **Teal Tint / Line** (`#dff1f1` / `#8fcfd1`): info badges and tiles.

#### Status (staff only)

| State | Accent | Surface | Text | Border |
| --- | --- | --- | --- | --- |
| Success | `#10b981` | `#dcfce7` | `#14532d` | `#86efac` |
| Warning | `#f59e0b` | `#fef9c3` | `#713f12` | `#fde047` |
| Danger | `#f43f5e` | `#fee2e2` | `#7f1d1d` | `#fca5a5` |

#### Neutral (staff)

- **Page canvas** (`#fafafa` / `--page`): whole background.
- **Surface** (`#fffdf8` / `--card`): cards, table body, inputs, dialogs.
- **Section** (`#ffffff` / `--section`): table headers, summary boxes, nav hover.
- **Hairline / Strong line** (`#d9d0c1` / `#b8ad9a`).
- **Ink / Muted** (`#2b2430` / `#6b6372`).

**The Plum-Is-Not-Status Rule.** Plum and teal never mean success, warning, or error on staff screens.

**The No-Gradient Staff Rule.** No `linear-gradient`, `radial-gradient`, `conic-gradient`, Tailwind gradient utilities, or shine/mesh overlays on staff, auth, or ops UI.

### Public landing (Multiplane Cel Dawn)

Off-white dawn ground with fern/pine vegetation tones and a single lamp-amber lit control. Defined as `--lp-*` on `.landing-page`.

#### Primary (lamp)

- **Lamp Hot** (`#f2b24a` / `--lp-lamp-hot`): default Book consultation fill — the lit window.
- **Lamp** (`#c4a35a` / `--lp-lamp`): hover fill; selection highlight; hero “Zero Investment” underline wash (`inset` lamp hit).

#### Secondary (fern / pine)

- **Fern** (`#6b8f71`): step rules, focus outline on landing.
- **Fern Deep** (`#3f5a45`): nav links, package CTAs, lamp-hit text.
- **Pine** (`#1e3a2e`): section titles, lamp border, footer ground, hover deepen.

#### Neutral (landing)

- **Dawn Haze** (`#f7f4ec` / `--lp-haze`): page and haze sections; footer text on pine.
- **Sheet** (`#fffdf8` / `--lp-sheet`): content sections, peek cards, sticky bar.
- **Mist** (`#d9e4ea`): table header wash, skeleton pulse tint.
- **Ink / Muted** (`#2b2430` / `#5a5160`): body and supporting copy.
- **Plane line** (`rgba(43, 36, 48, 0.16)`): hairline plane and section edges.

**The Lamp Window Rule.** Lamp amber is the only warm fill on the landing. It is reserved for the primary consultation CTA (and the matching hero underline). Do not sprinkle amber across cards or nav.

**The No-Plum-Chrome Rule.** Public `/` does not use staff plum button fills or teal ops chrome. Fern/pine carry navigation and structure; lamp carries the booking action.

---

## Typography

### Staff / ops

**Display / UI Font:** Inter (`--font-sans`)  
**Mono Font:** JetBrains Mono + `tabular-nums` (`--font-mono`)

**Character:** Dense, operational, sentence-case UI. No display serif in the back office.

#### Hierarchy (staff)

- **Page title** (600, 22px / `--text-xl`): control panel titles.
- **Brand / card heading** (600–700, 18px / `--text-lg`): navbar brand, card titles.
- **Body** (400, 15px / `--text-base`): inputs, table cells, copy.
- **Label / button** (500–600, 14px): form labels; buttons at 14px / 600.
- **Helper / table header** (600 for headers, 13px / `--text-sm`): sentence case, not uppercase.
- **Tech / badge** (600, 12px / `--text-xs`): badges, metadata.
- **Mono** (IDs, money, clock times only).

### Public landing

**Display Font:** Spectral 600/700 (`--lp-font-display`)  
**Body Font:** Manrope 500/600/700 (`--lp-font-body`)  
**Mono Font:** JetBrains Mono (`--lp-font-mono`) for package codes and INR

**Character:** Title-card serif for the offer; nearest-plane sans for nav, body, and the lamp label. Marketing voice stays on Spectral+Manrope; staff Inter never styles the landing hero.

#### Hierarchy (landing)

- **Display** (700, `clamp(40px, 6vw, 64px)`, line-height 1.02): hero “Go Solar at / Zero Investment”.
- **Headline** (700, `clamp(28px, 3.5vw, 36px)`, pine): section `h2`.
- **Title** (700, 18px Spectral): step `h3`.
- **Body** (500–700, 15–16px Manrope): ledes, nav, footer links.
- **Label** (700, 12px, 0.06–0.08em, uppercase): table headers, step labels, footer column titles.
- **Mono** (600, tabular): package codes, kW, INR.

**The Title-Card Rule.** Spectral is for hero and section display only on the landing. Controls, nav, and lamp CTA stay Manrope.

---

## Layout

### Staff / ops

Full-bleed Odoo shell. `AppShell` has no max-width and no outer card. `main` is `width: 100%`.

```
Navbar            full width, canvas, 1px bottom border
Control panel     full width, title left, actions right
KPI row           gutter-padded tinted tiles (optional)
List / table      full width surface, top/bottom hairlines only
```

- **Gutter:** `--layout-gutter` (16px) on navbar, control panel, KPI row, and first/last table cells.
- Feature pages are plain `div`s — no outer page padding; each band applies the gutter.
- **Tables are edge to edge** — no rounded outer frame.
- **Forms and auth cards only** are width-limited (`--auth-card-width` 440px; wide 560px). Auth page chrome stays full-bleed.

### Public landing

Scoped to `.landing-page`: column flex, `min-height: 100vh`, haze ground.

- **Gutter:** `--lp-gutter` = `clamp(20px, 4vw, 48px)`.
- **Hero:** multiplane stack + cel; `min-height: min(92vh, 860px)`; copy max-width ~36rem left; planes fill the frame.
- **Sections:** sheet or haze bands with section padding `clamp(40px, 6vw, 72px)` vertical; 1px bottom plane line.
- **Packages:** full-width table on sheet; below 900px becomes stacked labeled rows (thead hidden).
- **Steps:** 3-column grid → 1 column below 900px.
- **Footer:** pine full-bleed; 3-column grid → 1 column below 900px.
- **Mobile sticky bar:** shown at `max-width: 900px`; Packages / Steps / lamp CTA.

**The Cel-First Viewport Rule.** First viewport is brand, one Spectral offer, one supporting sentence, one lamp CTA, and the multiplane image — not a dashboard of equal package cards.

---

## Elevation & Depth

### Staff / ops

**Flat by default.** Depth is tonal (canvas → surface) plus 1px hairlines. No `box-shadow`. Focus is `2px solid --accent` with 1px offset.

### Public landing

Depth is **multiplane**, not material shadow UI.

- **Far / mid / near planes:** absolute painted plates (`plane-far-mist.png`, `hero-bg.jpg` photo plate, `plane-mid-fern.png`, `plane-near-haze.png`) with scroll-linked `translate3d` drift (far 0.08×, mid 0.18×, near 0.28× scrollY; near haze ×1.25). `prefers-reduced-motion: reduce` disables plane transforms.
- **Hairline plane edges:** `--lp-line` borders on hero and sections; photo plate has a left hairline.
- **Lamp treatment (CTA only):** sharp rectangle with pine 1px border plus inset highlight/shade and a thin lamp outer ring — reads as a lit cel window, not a floating card drop shadow. Do not reuse as a general card elevation system.
- **Peek / table / sticky bar:** sheet fills + 1px lines; peek uses translucent sheet `rgba(255, 253, 248, 0.88)`.

**The Multiplane Rule.** Landing depth comes from layered painted plates and parallax, not from staff-style tonal cards or drop shadows on content blocks.

---

## Shapes

### Staff / ops

- Buttons / inputs: 4px (`--radius-btn`, `--radius-input`).
- Cards / tiles: 6px (`--radius-card`).
- Badges: pill (`--radius-badge`).
- Borders: 1px default or strong; never thick frames.

### Public landing

- **Sharp cel geometry:** lamp CTA, peek items, package table, retry control — `border-radius: 0`.
- **Step markers:** 1px fern left rules, not numbered discs.
- **Plane silhouettes:** soft painted edges live in the PNG plates under `public/landing/planes/`, not in CSS radius.
- Focus: `2px solid --lp-fern`, offset 3px.

---

## Components

### Staff — Button (`components/ui/Button.tsx`)

- **Shape:** 4px radius, flat, weight 600, 8px icon gap.
- **Primary:** plum fill, on-brand text; hover/press darken.
- **Secondary / outline / danger:** surface+strong border; plum outline; danger rose fill.
- **Sizes:** `sm` | `md`. Disabled at 55% opacity.
- Create actions live in the control panel; destructive actions use `danger` and confirm.

### Staff — Badge, Input, Select, Table, Control panel, Navbar, KPI, Alert

- **Badge:** tinted pill variants `success | warning | danger | info | neutral` — capitalised, not uppercase.
- **Input / Select:** surface, strong border, 4px, 15px, `10px 12px`; error uses danger border + helper.
- **Tax select / Money input:** keep the incumbent contracts in feature work (predefined tax list from API; Indian grouping via shared `formatMoney` / `MoneyInput`; mono tabular amounts). Do not hardcode tax rows in components.
- **Table (`.data-table`):** no outer frame; header on `--section`; row hover uses page colour; mono for ID/money/time.
- **Control panel:** full-width canvas bar, 22px title, actions right.
- **Navbar:** brand, feature links, mode/user/role; active link 2px plum underline.
- **KPI tile:** tinted surface + matching 1px border; mono value.
- **Alert:** semantic surface/text/border + Lucide-style icon — never emoji.

### Landing — Lamp CTA (`.landing-lamp`)

- **Shape:** sharp rectangle; min-width 240px; min-height 54px; padding `16px 22px`.
- **Primary:** lamp-hot fill, ink text, 1px pine border, inset highlight + thin lamp ring.
- **Hover:** lamp fill; ring strengthens. **Active:** `translateY(1px)`.
- Routes to `/inquire` (“Book consultation” / “Start the survey form” / empty-state booking).

### Landing — Nav & brand

- Brand: logo 28px + Manrope 700 18px, tracking 0.04em.
- Links: fern-deep 14px / 700; hover pine. “How it works” hides below 900px in the top nav (still in sticky bar as “Steps”).

### Landing — Hero peek & package table

- **Peek:** up to three live packages (code, kind · kW · INR) on translucent sheet tiles; skeleton pulse while loading.
- **Table:** sheet, 1px line grid, uppercase mist headers; talker line under system name; “Size for my roof” fern-deep text CTA. Mobile: stacked `data-label` rows.

### Landing — Steps, footer, sticky bar

- **Steps:** three left-ruled items; uppercase fern-deep step label; Spectral `h3`.
- **Footer:** pine ground, haze text, lamp column titles; Explore + Contact columns; bottom bar with copyright.
- **Sticky bottom bar** (`≤900px`): sheet + top hairline; Packages / Steps text links + compact lamp CTA; safe-area padding.

### Landing — Retry / empty

- Retry: sharp ink-border sheet button. Empty state keeps Spectral heading + lamp CTA to inquire. Errors may reuse staff `Alert` for semantics but sit inside landing chrome.

---

## Do's and Don'ts

### Do

- **Do** treat HackCore (`tokens.css` + `components/ui`) as authoritative for `/app`, auth, and ops.
- **Do** scope all Multiplane Cel Dawn styling under `.landing-page` / `landing.css`.
- **Do** keep staff lists and control panels edge to edge; plum for the main staff action; teal for staff links/focus.
- **Do** put money, IDs, and times in JetBrains Mono on both surfaces where numbers appear.
- **Do** use Spectral + Manrope + lamp amber + pine/fern only on the public landing.
- **Do** keep plane depth in `public/landing/planes/` + scroll drift; respect `prefers-reduced-motion`.
- **Do** send landing CTAs to `/inquire` and load packages from the real public API.

### Don't

- **Don't** apply staff no-gradient / no-shadow / plum rules as a ban on the landing's painted plates or lamp inset ring — and **don't** weaken those bans on staff screens.
- **Don't** bring plum primary buttons, Inter control-panel chrome, or Odoo table framing onto `/`.
- **Don't** bring lamp amber, Spectral hero type, or fern multiplane plates into `/app` or auth cards.
- **Don't** wrap staff pages in a max-width bordered card.
- **Don't** use emoji in the DOM on either surface.
- **Don't** invent testimonials, trust stats, or fallback package rows when the API fails.
- **Don't** use off-palette status blues/reds/greens outside the staff semantic table.
- **Don't** store comma-formatted money strings in state or hardcode tax lists in components.
