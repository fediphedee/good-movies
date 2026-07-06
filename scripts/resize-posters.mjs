// Downscale/compress poster-override images so we don't ship huge files.
// In-place, max 600px wide (posters display at ≤300px, so 600 = 2× retina),
// JPEG quality 82. Run after dropping new images in:
//   npm run resize-posters
// Uses macOS `sips` (no dependencies).
import { readdirSync } from 'fs'
import { execFileSync } from 'child_process'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'poster-overrides')
const MAX_W = 600
const QUALITY = 82
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const widthOf = p =>
  parseInt(execFileSync('sips', ['-g', 'pixelWidth', p], { encoding: 'utf8' }).match(/pixelWidth:\s*(\d+)/)?.[1] || '0', 10)

let changed = 0
for (const f of readdirSync(dir)) {
  const ext = extname(f).toLowerCase()
  if (!EXTS.has(ext)) continue
  const p = join(dir, f)
  const w = widthOf(p)
  const args = []
  if (w > MAX_W) args.push('--resampleWidth', String(MAX_W))
  if (ext === '.jpg' || ext === '.jpeg') args.push('-s', 'formatOptions', String(QUALITY))
  if (args.length) {
    execFileSync('sips', [...args, p])
    console.log(`  ✓ ${f}: ${w}px → ${Math.min(w, MAX_W)}px`)
    changed++
  } else {
    console.log(`  – ${f}: ${w}px (already ≤ ${MAX_W})`)
  }
}
console.log(`\nDone: ${changed} image(s) resized.`)
