// One-pass backfill: add `originalLanguage` (ISO 639-1) + `countries`
// (ISO 3166-1 production countries) to every movie in public/movies.json using
// its tmdbId. Idempotent (cached by tmdbId). Run with:
//   node --env-file=.env scripts/add-language.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN in environment'); process.exit(1) }

const CACHE_PATH = join(root, 'data/tmdb-language-cache.json')
const MOVIES_PATH = join(root, 'public/movies.json')

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {}
const data = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))
const { movies } = data

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

async function langFor(tmdbId) {
  const key = String(tmdbId)
  if (cache[key]) return cache[key]
  const detail = await tmdb(`/movie/${tmdbId}?language=en-US`)
  const result = {
    originalLanguage: detail.original_language ?? null,
    countries: (detail.production_countries || []).map(c => c.iso_3166_1),
  }
  cache[key] = result
  return result
}

async function processInBatches(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn))
    if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 250))
  }
}

let done = 0, missing = 0, failed = 0
console.log(`Backfilling language/countries for ${movies.length} movies…`)

await processInBatches(movies, 15, async (movie) => {
  if (!movie.tmdbId) { movie.originalLanguage = null; movie.countries = []; missing++; return }
  try {
    const { originalLanguage, countries } = await langFor(movie.tmdbId)
    movie.originalLanguage = originalLanguage
    movie.countries = countries
    done++
  } catch (err) {
    movie.originalLanguage = null
    movie.countries = []
    failed++
    console.error(`  ✗ ${movie.title} (${movie.year}): ${err.message}`)
  }
  const total = done + missing + failed
  if (total % 100 === 0) {
    process.stdout.write(`  ${total}/${movies.length}\n`)
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
  }
})

writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
writeFileSync(
  MOVIES_PATH,
  JSON.stringify({ ...data, movies, total: movies.length, generated: new Date().toISOString() }, null, 2)
)

// Report language distribution
const byLang = {}
for (const m of movies) if (m.originalLanguage) byLang[m.originalLanguage] = (byLang[m.originalLanguage] || 0) + 1
const top = Object.entries(byLang).sort((a, b) => b[1] - a[1]).slice(0, 12)
console.log(`\n✓ Done: ${done} filled, ${missing} without tmdbId, ${failed} errors`)
console.log(`  languages: ${top.map(([k, v]) => `${k}:${v}`).join('  ')}`)
