# Design Tokens

Source of truth for all design decisions in this project.
Extracted from Figma file: `J9fnmKejRgwy6x4ZC57Vpw` (movie-test_V2).

---

## Token architecture

Three layers. Never skip a layer or mix them.

```
Primitives  →  raw named values, no semantic meaning, no modes
Tokens      →  semantic meaning + Light/Dark modes, alias to Primitives
Kumo bridge →  maps our Tokens → Kumo's internal CSS variables (in kumo-theme.css)
```

Designers work in **Tokens**. They should never apply a Primitive directly to a component.
Developers override Kumo in **kumo-theme.css** using our Token CSS custom properties.

---

## Layer 1 — Primitives

Single mode ("Value"). Raw palette. No light/dark here.

| Figma variable       | Hex       | Description              |
|----------------------|-----------|--------------------------|
| color/warm-white     | #F5F0E8   | Off-white, warm-toned    |
| color/off-black      | #0F0F0F   | Near-black               |
| color/mint           | #8AFFC8   | Accent — light mode      |
| color/hot-pink       | #FE008C   | Accent — dark mode       |

---

## Layer 2 — Tokens

Two modes: **Light** and **Dark**. All values alias to Primitives (except muted/divider which require opacity).

| Figma variable   | CSS property    | Light             | Dark              |
|------------------|-----------------|-------------------|-------------------|
| color/bg         | `--bg`          | warm-white        | off-black         |
| color/fg         | `--fg`          | off-black         | warm-white        |
| color/accent     | `--accent`      | mint              | hot-pink          |
| color/muted      | `--muted`       | off-black @ 45%   | warm-white @ 45%  |
| color/divider    | `--divider`     | off-black @ 18%   | warm-white @ 18%  |
| color/focus      | `--focus`       | off-black         | warm-white        |

### Spacing tokens (same in both modes)

| Figma variable | CSS property    | Value |
|----------------|-----------------|-------|
| space/4        | `--space-4`     | 4px   |
| space/8        | `--space-8`     | 8px   |
| space/12       | `--space-12`    | 12px  |
| space/16       | `--space-16`    | 16px  |
| space/20       | `--space-20`    | 20px  |
| space/24       | `--space-24`    | 24px  |
| space/40       | `--space-40`    | 40px  |
| space/48       | `--space-48`    | 48px  |
| space/64       | `--space-64`    | 64px  |

---

## Layer 3 — CSS custom properties

These are defined in `src/index.css` and used throughout the app.
The Kumo bridge in `src/kumo-theme.css` maps these into Kumo's token surface.

```css
/* Light mode (default) */
:root {
  --bg:      #F5F0E8;
  --fg:      #0F0F0F;
  --accent:  #8AFFC8;
  --muted:   rgba(15, 15, 15, 0.45);
  --divider: rgba(15, 15, 15, 0.18);
  --focus:   #0F0F0F;
}

/* Dark mode — toggled via data-theme="dark" on <html> */
:root[data-theme='dark'] {
  --bg:      #0F0F0F;
  --fg:      #F5F0E8;
  --accent:  #FE008C;
  --muted:   rgba(245, 240, 232, 0.45);
  --divider: rgba(245, 240, 232, 0.18);
  --focus:   #F5F0E8;
}
```

---

## Typography

Body text uses **Azeret Mono** (variable font, all weights) loaded from Google Fonts.
Display headings use **Recoleta** (self-hosted via Fontspring — not available on Google Fonts).

CSS tokens: `--font` (Azeret Mono) and `--font-display` (Recoleta).

| Style name            | Font          | Size | Weight  | Tracking | Line height | Usage                        |
|-----------------------|---------------|------|---------|----------|-------------|------------------------------|
| Display/Hero          | Recoleta      | 80px | Regular | -3%      | 105%        | Page hero heading            |
| Display/Heading       | Recoleta      | 36px | Regular | -2%      | 110%        | Section headings             |
| Display/Subheading    | Azeret Mono   | 20px | Medium  | -1%      | 120%        | Sub-sections                 |
| Body/Base             | 13px | Regular | +1%      | 150%        | Body copy, card text         |
| Body/Small            | 12px | Regular | +1%      | 150%        | Secondary text, chips        |
| Label/Uppercase-MD    | 11px | Regular | +8%      | 140%        | Button labels, CTAs          |
| Label/Uppercase-SM    | 10px | Regular | +10%     | 140%        | Eyebrow labels ("TRY ASKING")|
| Label/Meta            | 11px | Regular | +3%      | 140%        | Metadata, footer             |
| Code/Mono             | 13px | Regular | +1%      | 150%        | Monospace code               |

---

## Design rules

- **Zero border-radius** everywhere. No `rounded-*` classes. Brutalist aesthetic.
- **No shadows.** No `shadow-*` classes.
- **Hairline dividers** only via `border: 1px solid var(--divider)` — never thicker.
- **Never use raw hex values** in components. Always reference a token.
- **Never apply Primitive tokens directly** to components. Always go through Tokens.

---

## Refreshing from Figma

When tokens change in Figma, update:
1. The table above (this file)
2. The `:root` blocks in `src/index.css`
3. The `@theme` overrides in `src/kumo-theme.css` if Kumo-mapped values changed
