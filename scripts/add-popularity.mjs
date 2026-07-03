// One-pass backfill: add `voteCount` + `popularity` to every movie in
// public/movies.json using its existing tmdbId. Idempotent (cached by tmdbId),
// safe to re-run. Run with: node --env-file=.env scripts/add-popularity.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN in environment'); process.exit(1) }

const CACHE_PATH = join(root, 'data/tmdb-popularity-cache.json')
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

async function fameFor(tmdbId) {
  const key = String(tmdbId)
  if (cache[key]) return cache[key]
  const detail = await tmdb(`/movie/${tmdbId}?language=en-US`)
  const result = { voteCount: detail.vote_count ?? null, popularity: detail.popularity ?? null }
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
console.log(`Backfilling vote counts for ${movies.length} movies…`)

await processInBatches(movies, 15, async (movie) => {
  if (!movie.tmdbId) { movie.voteCount = null; movie.popularity = null; missing++; return }
  try {
    const { voteCount, popularity } = await fameFor(movie.tmdbId)
    movie.voteCount = voteCount
    movie.popularity = popularity
    done++
  } catch (err) {
    movie.voteCount = null
    movie.popularity = null
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

// Report the strict-edge thresholds (15th / 85th percentile of vote_count)
const counts = movies.map(m => m.voteCount).filter(v => typeof v === 'number').sort((a, b) => a - b)
const pct = p => counts[Math.floor((counts.length - 1) * p)]
console.log(`\n✓ Done: ${done} filled, ${missing} without tmdbId, ${failed} errors`)
console.log(`  vote_count range: ${counts[0]} … ${counts[counts.length - 1]}`)
console.log(`  p15 (obscure ≤): ${pct(0.15)}`)
console.log(`  p85 (famous ≥):  ${pct(0.85)}`)
