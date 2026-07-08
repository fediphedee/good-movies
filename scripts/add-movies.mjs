// Add films that aren't in the Letterboxd export to movies.json + ratings.csv,
// fetching full TMDB metadata (poster, genres, cast, keywords, …).
// Idempotent: skips films whose id already exists.
// Run:  node --env-file=.env scripts/add-movies.mjs   then   node --env-file=.env scripts/tag-moods.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN'); process.exit(1) }

// Films to add. id = Letterboxd film slug. Ratings default to a democratic 4
// until real ones land in the next Letterboxd export.
const ADDITIONS = [
  // batch 3 (2026-07-08) — mumblecore/indie picks; earlier batches already merged
  // (re-runs skip existing ids). Set `rating` to override the default, and
  // `tmdbId` when auto-search mis-matches (wrong film or premiere-year drift).
  // NB: don't add 'Sirât' — already in the export as 'Sirāt' (macron, boxd.it/HxJo)
  { title: 'Napoleon Dynamite', year: 2004, slug: 'napoleon-dynamite' },
  { title: 'The Puffy Chair', year: 2005, slug: 'the-puffy-chair' },
  { title: 'The Squid and the Whale', year: 2005, slug: 'the-squid-and-the-whale' },
  { title: 'Lars and the Real Girl', year: 2007, slug: 'lars-and-the-real-girl' },
  { title: 'Away We Go', year: 2009, slug: 'away-we-go' },
  { title: 'Blue Valentine', year: 2010, slug: 'blue-valentine', rating: 4.5 },
  { title: 'Obvious Child', year: 2014, slug: 'obvious-child' },
]
const DEFAULT_RATING = 4
const WATCHED_DATE = '2026-07-08'

const MOVIES_PATH = join(root, 'public/movies.json')
const CSV_PATH = join(root, 'data/ratings.csv')
const loadCache = p => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {})
const kwCachePath = join(root, 'data/tmdb-keywords-cache.json')
const castCachePath = join(root, 'data/tmdb-cast-cache.json')
const langCachePath = join(root, 'data/tmdb-language-cache.json')
const popCachePath = join(root, 'data/tmdb-popularity-cache.json')
const kwCache = loadCache(kwCachePath)
const castCache = loadCache(castCachePath)
const langCache = loadCache(langCachePath)
const popCache = loadCache(popCachePath)

const data = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

async function findId(title, year) {
  const q = encodeURIComponent(title)
  let d = await tmdb(`/search/movie?query=${q}&year=${year}&language=en-US`)
  if (!d.results?.length) d = await tmdb(`/search/movie?query=${q}&language=en-US`)
  if (!d.results?.length) return null
  const exact = d.results.filter(r => r.release_date?.slice(0, 4) === String(year))
  return (exact.length ? exact : d.results).sort((a, b) => b.popularity - a.popularity)[0].id
}

// Same decade tags parse-csv.mjs derives
function getMoodTags(year) {
  const tags = []
  const decade = Math.floor(year / 10) * 10
  if (decade <= 1950) tags.push('classic', 'old hollywood', 'black and white')
  if (decade >= 1960 && decade <= 1970) tags.push('new wave', 'sixties', 'counterculture')
  if (decade >= 1970 && decade <= 1980) tags.push('seventies', 'new hollywood', 'gritty')
  if (decade >= 1980 && decade <= 1990) tags.push('eighties', 'blockbuster era')
  if (decade >= 1990 && decade <= 2000) tags.push('nineties', 'indie boom')
  if (decade >= 2000 && decade <= 2010) tags.push('2000s')
  if (decade >= 2010) tags.push('contemporary', 'modern')
  return tags
}

const csvLines = []

for (const { title, year, slug, tmdbId: fixedId, rating = DEFAULT_RATING } of ADDITIONS) {
  if (data.movies.some(m => m.id === slug || (m.title === title && m.year === year))) {
    console.log(`  – ${title} (${year}): already present, skipping`)
    continue
  }
  try {
    const tmdbId = fixedId || await findId(title, year)
    if (!tmdbId) { console.error(`  ✗ ${title}: no TMDB match`); continue }

    const detail = await tmdb(`/movie/${tmdbId}?language=en-US`)
    const kwRaw = await tmdb(`/movie/${tmdbId}/keywords`)
    const credits = await tmdb(`/movie/${tmdbId}/credits?language=en-US`)
    const keywords = kwRaw.keywords?.map(k => k.name) || []
    const actors = credits.cast?.slice(0, 10).map(c => c.name) || []
    const director = credits.crew?.find(c => c.job === 'Director')?.name || null

    data.movies.push({
      id: slug,
      title,
      year,
      rating,
      watchedDate: WATCHED_DATE,
      letterboxdUri: `https://letterboxd.com/film/${slug}`,
      genres: detail.genres?.map(g => g.name) || [],
      runtime: detail.runtime || null,
      synopsis: detail.overview || null,
      posterPath: detail.poster_path || null,
      director,
      moodTags: getMoodTags(year),
      tmdbId,
      moods: [], // derived by tag-moods.mjs
      keywords: keywords.slice(0, 20),
      voteCount: detail.vote_count ?? null,
      popularity: detail.popularity ?? null,
      actors,
      originalLanguage: detail.original_language ?? null,
      countries: (detail.production_countries || []).map(c => c.iso_3166_1),
    })

    kwCache[tmdbId] = keywords
    castCache[tmdbId] = actors
    langCache[tmdbId] = {
      originalLanguage: detail.original_language ?? null,
      countries: (detail.production_countries || []).map(c => c.iso_3166_1),
    }
    popCache[tmdbId] = { voteCount: detail.vote_count ?? null, popularity: detail.popularity ?? null }
    csvLines.push(`${WATCHED_DATE},${title.includes(',') ? `"${title}"` : title},${year},https://letterboxd.com/film/${slug},${rating}`)

    console.log(`  ✓ ${title} (${year}) [tmdb ${tmdbId}] — ${director || 'n/a'}, ${detail.genres?.map(g => g.name).join('/') || 'no genres'}, poster=${detail.poster_path ? 'yes' : 'NO'}`)
  } catch (err) {
    console.error(`  ✗ ${title}: ${err.message}`)
  }
}

// Keep parse-csv's ordering: rating desc, then title
data.movies.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))

writeFileSync(kwCachePath, JSON.stringify(kwCache, null, 2))
writeFileSync(castCachePath, JSON.stringify(castCache, null, 2))
writeFileSync(langCachePath, JSON.stringify(langCache, null, 2))
writeFileSync(popCachePath, JSON.stringify(popCache, null, 2))
writeFileSync(MOVIES_PATH, JSON.stringify({ movies: data.movies, total: data.movies.length, generated: new Date().toISOString() }, null, 2))

if (csvLines.length) {
  const csv = readFileSync(CSV_PATH, 'utf8')
  writeFileSync(CSV_PATH, csv.replace(/\n?$/, '\n') + csvLines.join('\n') + '\n')
}

console.log(`\n✓ ${csvLines.length} film(s) added (${data.movies.length} total). Now run: node --env-file=.env scripts/tag-moods.mjs`)
