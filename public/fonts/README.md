# Fonts

Drop the Recoleta files here (self-hosted via Fontspring — not on Google Fonts).

Expected filenames (referenced by `@font-face` in `src/index.css`):

- `Recoleta-Regular.woff2`  (weight 400) — required for the hero title
- `Recoleta-Regular.woff`   (optional legacy fallback)
- `Recoleta-Medium.woff2`   (weight 500) — optional
- `Recoleta-Medium.woff`    (optional legacy fallback)

Only the Regular is needed for the hero. Once the file is here, restart is not
required — Vite serves /public statically, just refresh the page.
