# Kumo Components

Reference for every Kumo component used in this project.
Read this before building or modifying any UI component.

Kumo package: `@cloudflare/kumo`
Built on: Base UI (headless) + Tailwind v4

---

## How Kumo theming works

Kumo uses three mechanisms for styling, in order of specificity:

1. **`@theme` CSS variables** — Kumo's global token surface (`--color-kumo-canvas`, `--font-sans`, `--radius-lg`, etc.). We override these in `src/kumo-theme.css`.
2. **`className` prop** — Tailwind utility classes merged with Kumo's defaults. Use for component-specific overrides.
3. **`style` prop** — Inline CSS variables. Kumo's primary button sets `--kumo-button-emphasis-bg` as an inline style, which overrides `@theme`. Must be countered with the `style` prop.

### Critical gotcha — inline style override

Kumo's `<Button variant="primary">` injects emphasis variables as **inline styles** on the DOM element:
```
--kumo-button-emphasis-bg: color-mix(in oklch, var(--color-kumo-brand), white 30%)
--kumo-button-emphasis-ring: color-mix(in oklch, var(--color-kumo-brand), black 10%)
--kumo-button-emphasis-gradient-start: color-mix(in oklch, var(--color-kumo-brand), white 15%)
--kumo-button-emphasis-gradient-end: var(--color-kumo-brand)
```
These override anything set in `:root` or `@theme`. The only way to win is to pass them back via the `style` prop — React merges inline styles and ours take precedence if the component spreads `...props.style` last.

### Tailwind scanning

Kumo's dynamic class strings (e.g. `bg-(--kumo-button-emphasis-bg)`) live in pre-built JS files that Tailwind doesn't scan by default. Add this to `src/index.css`:

```css
@source '../node_modules/@cloudflare/kumo/dist';
```

Without this, those classes exist in the DOM but have no generated CSS.

---

## Global theme overrides

File: `src/kumo-theme.css`

```css
@theme {
  --radius-xs: 0px; --radius-sm: 0px; --radius-md: 0px;
  --radius-lg: 0px; --radius-xl: 0px; --radius-2xl: 0px;

  --font-sans: 'Azeret Mono', ui-monospace, monospace;
  --font-mono: 'Azeret Mono', ui-monospace, monospace;

  --color-kumo-canvas:   var(--bg);
  --color-kumo-base:     var(--bg);
  --color-kumo-contrast: var(--fg);
  --color-kumo-control:  var(--bg);
  --color-kumo-line:     var(--divider);
  --color-kumo-interact: var(--divider);

  --text-color-kumo-default:     var(--fg);
  --text-color-kumo-strong:      var(--fg);
  --text-color-kumo-subtle:      var(--muted);
  --text-color-kumo-placeholder: var(--muted);
  --text-color-kumo-inverse:     var(--bg);

  --color-kumo-focus: var(--focus);
}
```

Also in `src/index.css` `:root` blocks (NOT `@theme` — these need inline-style specificity):
```css
--kumo-button-emphasis-bg:   var(--fg);
--kumo-button-emphasis-ring: var(--fg);
```

---

## Components

### Button

**Import:** `import { Button } from '@cloudflare/kumo/components/button'`

**Variants used:**

| Kumo variant | Our usage          | Figma component           |
|--------------|--------------------|---------------------------|
| `primary`    | Main CTA ("Find a film") | Button/variant=primary    |
| `ghost`      | Destructive/clear actions | Button/variant=ghost   |
| `outline`    | Suggestion chips   | Button/variant=chip        |

**Required pattern for primary buttons** (inline style override + all four emphasis variables):

```tsx
<Button
  variant="primary"
  onClick={handleSearch}
  disabled={loading || !query.trim()}
  className="text-xs tracking-widest uppercase text-(--bg)!"
  style={{
    '--kumo-button-emphasis-bg':             'var(--fg)',
    '--kumo-button-emphasis-ring':           'var(--fg)',
    '--kumo-button-emphasis-gradient-start': 'var(--fg)',
    '--kumo-button-emphasis-gradient-end':   'var(--fg)',
  } as React.CSSProperties}
>
  Find a film
</Button>
```

**Ghost button:**
```tsx
<Button
  variant="ghost"
  onClick={handleClear}
  className="text-xs tracking-widest uppercase"
>
  Clear
</Button>
```

**Chip/outline button:**
```tsx
<Button
  variant="outline"
  onClick={() => usePrompt(p)}
  className="text-xs tracking-wide text-(--muted) border-(--divider) hover:text-(--fg) hover:border-(--fg)"
>
  {label}
</Button>
```

---

### Input

**Import:** `import { Input } from '@cloudflare/kumo/components/input'`

**Required overrides** — strip Kumo's default chrome (border, ring, shadow) for our underline-only style:

```tsx
<Input
  ref={inputRef}
  value={query}
  onChange={e => setQuery(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="describe your mood, a genre, a decade, a feeling…"
  className="w-full border-none! shadow-none! ring-0! bg-transparent! text-base tracking-wide"
/>
```

The `border-none! shadow-none! ring-0!` pattern uses Tailwind v4's `!` modifier for `!important` to override Kumo's defaults.

---

## Adding a new Kumo component

When introducing a component not listed above:

1. Check the export: `cat node_modules/@cloudflare/kumo/dist/src/components/<name>/index.d.ts`
2. Read its variant definitions (look for `KUMO_*_VARIANTS` constants)
3. Identify which `--kumo-*` CSS variables it uses internally
4. Test whether any are set as inline styles (inspect the DOM — if they appear in `element.style`, `:root` overrides won't work)
5. Apply overrides via `@theme` (global), `className` (utility), or `style` prop (inline)
6. Document it in this file

---

## What Kumo gives us (don't rebuild these)

- Keyboard navigation on all interactive elements
- ARIA roles and accessible labels
- Focus management
- Loading states (`loading` prop on Button)
- Disabled state handling
- `LinkButton` for anchor-styled buttons with router integration
