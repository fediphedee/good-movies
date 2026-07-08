// One-pass backfill: add `actors` (top-billed cast) to every movie in
// public/movies.json using its tmdbId. Idempotent (cached by tmdbId), safe to
// re-run. Run with: node --env-file=.env scripts/add-cast.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN in environment'); process.exit(1) }

const CACHE_PATH = join(root, 'data/tmdb-cast-cache.json')
const MOVIES_PATH = join(root, 'public/movies.json')

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {}
const data = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))
const { movies } = data

// TV entries (Letterboxd ids, mirrors FIXES in fix-records.mjs) — their tmdbId
// is in TMDB's *TV* id namespace, so /movie/{id}/credits would return an
// unrelated film's cast. Cache keys are prefixed "tv:" to avoid collisions.
const TV_IDS = new Set(['TvUy', 'sG9O', 'K7fI', 'gACc', 'IWYq'])

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

async function castFor(tmdbId, type = 'movie') {
  const key = type === 'tv' ? `tv:${tmdbId}` : String(tmdbId)
  if (cache[key]) return cache[key]
  const credits = type === 'tv'
    ? await tmdb(`/tv/${tmdbId}/aggregate_credits?language=en-US`)
    : await tmdb(`/movie/${tmdbId}/credits?language=en-US`)
  const actors = credits.cast?.slice(0, 10).map(c => c.name) || []
  cache[key] = actors
  return actors
}

async function processInBatches(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn))
    if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 250))
  }
}

let done = 0, missing = 0, failed = 0
console.log(`Backfilling cast for ${movies.length} movies…`)

await processInBatches(movies, 15, async (movie) => {
  if (!movie.tmdbId) { movie.actors = []; missing++; return }
  try {
    movie.actors = await castFor(movie.tmdbId, TV_IDS.has(movie.id) ? 'tv' : 'movie')
    done++
  } catch (err) {
    movie.actors = []
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

console.log(`\n✓ Done: ${done} filled, ${missing} without tmdbId, ${failed} errors`)
