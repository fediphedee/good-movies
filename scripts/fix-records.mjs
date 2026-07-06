// Re-point specific films/shows to their CORRECT TMDB entry (movie or TV) and
// re-fetch real metadata. The original enrichment (movie-only search) either
// mis-matched these or missed them (TV shows). Keyed by Letterboxd id.
// Run:  node --env-file=.env scripts/fix-records.mjs   then   npm run … tag-moods
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN'); process.exit(1) }

// The records to fix: Letterboxd id, movie|tv, and the correct TMDB id
// (hard-coded — auto-search mis-matched the ambiguous movie titles).
const FIXES = [
  { id: 'jHWa', type: 'movie', tmdbId: 540709 }, // Ema (2019, Pablo Larraín)
  { id: 'nlQC', type: 'movie', tmdbId: 630240 }, // Titane (2021, Julia Ducournau)
  { id: 'TvUy', type: 'tv',    tmdbId: 277685 }, // Pee-wee as Himself (2025)
  { id: 'sG9O', type: 'tv',    tmdbId: 90972  }, // Station Eleven (2021)
  { id: 'K7fI', type: 'tv',    tmdbId: 204154 }, // Scavengers Reign (2023)
  { id: 'gACc', type: 'tv',    tmdbId: 74313  }, // Blue Planet II (2017)
]

const KW_CACHE_PATH = join(root, 'data/tmdb-keywords-cache.json')
const MOVIES_PATH = join(root, 'public/movies.json')
const kwCache = existsSync(KW_CACHE_PATH) ? JSON.parse(readFileSync(KW_CACHE_PATH, 'utf8')) : {}
const data = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

const yearOf = (r, type) => (type === 'movie' ? r.release_date : r.first_air_date)?.slice(0, 4)

async function findId(title, year, type) {
  const q = encodeURIComponent(title)
  const yearParam = type === 'movie' ? `&year=${year}` : `&first_air_date_year=${year}`
  let d = await tmdb(`/search/${type}?query=${q}${yearParam}&language=en-US`)
  if (!d.results?.length) d = await tmdb(`/search/${type}?query=${q}&language=en-US`)
  if (!d.results?.length) return null
  const exact = d.results.filter(r => yearOf(r, type) === String(year))
  return (exact.length ? exact : d.results).sort((a, b) => b.popularity - a.popularity)[0].id
}

async function fetchRecord(tmdbId, type) {
  const detail = await tmdb(`/${type}/${tmdbId}?language=en-US`)
  const kwRaw = await tmdb(`/${type}/${tmdbId}/keywords`)
  const keywords = (type === 'movie' ? kwRaw.keywords : kwRaw.results)?.map(k => k.name) || []

  let director = null
  if (type === 'movie') {
    const credits = await tmdb(`/movie/${tmdbId}/credits?language=en-US`)
    director = credits.crew?.find(c => c.job === 'Director')?.name || null
  } else {
    director = detail.created_by?.map(c => c.name).join(', ') || null
  }

  return {
    tmdbId,
    synopsis: detail.overview || null,
    posterPath: detail.poster_path || null,
    genres: detail.genres?.map(g => g.name) || [],
    runtime: type === 'movie' ? (detail.runtime || null) : (detail.episode_run_time?.[0] || null),
    originalLanguage: detail.original_language ?? null,
    countries: type === 'movie'
      ? (detail.production_countries || []).map(c => c.iso_3166_1)
      : (detail.origin_country || []),
    voteCount: detail.vote_count ?? null,
    popularity: detail.popularity ?? null,
    director,
    keywords,
  }
}

for (const { id, type, tmdbId: fixedId } of FIXES) {
  const movie = data.movies.find(m => m.id === id)
  if (!movie) { console.error(`  ✗ ${id}: not found in movies.json`); continue }
  try {
    const tmdbId = fixedId || await findId(movie.title, movie.year, type)
    if (!tmdbId) { console.error(`  ✗ ${movie.title}: no ${type} match`); continue }
    const rec = await fetchRecord(tmdbId, type)
    // Patch (keep Letterboxd-authoritative title/year/rating/id/letterboxdUri)
    movie.tmdbId = rec.tmdbId
    movie.synopsis = rec.synopsis
    movie.posterPath = rec.posterPath
    movie.genres = rec.genres
    movie.runtime = rec.runtime
    movie.originalLanguage = rec.originalLanguage
    movie.countries = rec.countries
    movie.voteCount = rec.voteCount
    movie.popularity = rec.popularity
    movie.director = rec.director
    movie.keywords = rec.keywords.slice(0, 20)
    kwCache[rec.tmdbId] = rec.keywords // full list for tag-moods to re-derive moods
    console.log(`  ✓ ${movie.title} (${movie.year}) [${type} ${tmdbId}] — ${rec.director || 'n/a'}, lang=${rec.originalLanguage}, ${rec.keywords.length} kw`)
  } catch (err) {
    console.error(`  ✗ ${movie.title}: ${err.message}`)
  }
}

writeFileSync(KW_CACHE_PATH, JSON.stringify(kwCache, null, 2))
writeFileSync(MOVIES_PATH, JSON.stringify({ ...data, generated: new Date().toISOString() }, null, 2))
console.log('\n✓ Records patched. Now run: node --env-file=.env scripts/tag-moods.mjs')
