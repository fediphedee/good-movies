import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN in environment'); process.exit(1) }

const CACHE_PATH = join(root, 'data/tmdb-cache.json')
const MOVIES_PATH = join(root, 'public/movies.json')

// Load cache (persists between runs so we never re-fetch)
const cache = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  : {}

const { movies } = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

async function findMovie(title, year) {
  const cacheKey = `${title}::${year}`
  if (cache[cacheKey]) return cache[cacheKey]

  // Search by title + year
  const q = encodeURIComponent(title)
  let data = await tmdb(`/search/movie?query=${q}&year=${year}&language=en-US&page=1`)

  // Fall back without year constraint if no results
  if (!data.results?.length) {
    data = await tmdb(`/search/movie?query=${q}&language=en-US&page=1`)
  }

  if (!data.results?.length) {
    cache[cacheKey] = null
    return null
  }

  // Pick best match: prefer same year, then highest popularity
  const match = data.results
    .filter(r => Math.abs(r.release_date?.slice(0, 4) - year) <= 1)
    .sort((a, b) => b.popularity - a.popularity)[0]
    || data.results[0]

  // Fetch full details + credits
  const [detail, credits] = await Promise.all([
    tmdb(`/movie/${match.id}?language=en-US`),
    tmdb(`/movie/${match.id}/credits?language=en-US`),
  ])

  const director = credits.crew?.find(c => c.job === 'Director')?.name || null

  const result = {
    tmdbId: match.id,
    genres: detail.genres?.map(g => g.name) || [],
    runtime: detail.runtime || null,
    synopsis: detail.overview || null,
    posterPath: detail.poster_path || null,
    director,
    moodTags: detail.genres?.map(g => g.name.toLowerCase()) || [],
  }

  cache[cacheKey] = result
  return result
}

// Rate limit: TMDB allows ~40 req/s — we do 2 concurrent calls per movie
// so cap at 15 movies in parallel to stay safe
async function processInBatches(items, batchSize, fn) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const res = await Promise.all(batch.map(fn))
    results.push(...res)
    // Small pause between batches
    if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 300))
  }
  return results
}

let enriched = 0
let skipped = 0
let failed = 0

console.log(`Enriching ${movies.length} movies from TMDB…`)

await processInBatches(movies, 12, async (movie, _i) => {
  try {
    const data = await findMovie(movie.title, movie.year)
    if (data) {
      Object.assign(movie, data)
      enriched++
    } else {
      skipped++
    }
  } catch (err) {
    failed++
    console.error(`  ✗ ${movie.title} (${movie.year}): ${err.message}`)
  }

  const total = enriched + skipped + failed
  if (total % 50 === 0) {
    process.stdout.write(`  ${total}/${movies.length} (${enriched} enriched, ${skipped} not found, ${failed} errors)\n`)
    // Save cache checkpoint every 50
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
  }
})

// Final save
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
writeFileSync(
  MOVIES_PATH,
  JSON.stringify({ movies, total: movies.length, generated: new Date().toISOString() }, null, 2)
)

console.log(`\n✓ Done: ${enriched} enriched, ${skipped} not found, ${failed} errors`)
console.log(`✓ Cache saved to data/tmdb-cache.json`)
console.log(`✓ Movies saved to public/movies.json`)
