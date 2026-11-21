// Monthly diary sync: pull recent entries from the Letterboxd diary RSS feed,
// keep the ones that clear the rating bar (and aren't rewatches or TV), skip
// anything already in the list, and enrich the rest from TMDB — the same shape
// add-movies.mjs produces. The feed hands us the exact tmdb:movieId, so there's
// no fuzzy title matching.
//
// Usage:
//   node scripts/sync-diary.mjs                 # DRY RUN — prints what it would add, writes nothing (no token needed)
//   node --env-file=.env scripts/sync-diary.mjs --write   # actually enrich + append to movies.json + ratings.csv
//
// After a --write run, finish the pipeline:
//   node --env-file=.env scripts/tag-moods.mjs
//   node scripts/resize-posters.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── Config ──────────────────────────────────────────────────────────────────
const USERNAME = 'fediphe'
const RSS_URL = `https://letterboxd.com/${USERNAME}/rss/`
const MIN_RATING = 3        // keep films rated this or higher (half-stars allowed)
const SKIP_REWATCHES = true // a rewatch is the same film — don't re-add it
// ─────────────────────────────────────────────────────────────────────────────

const WRITE = process.argv.includes('--write')

const MOVIES_PATH = join(root, 'public/movies.json')
const CSV_PATH = join(root, 'data/ratings.csv')

// Minimal XML-entity decode for feed text (titles use &amp; &#039; etc.)
const decode = (s = '') => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, '&')

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1].trim()) : null
}

// Parse the RSS into diary candidates (one per <item> that is a film watch).
function parseFeed(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  const out = []
  for (const it of items) {
    const watchedDate = tag(it, 'letterboxd:watchedDate')
    const movieId = tag(it, 'tmdb:movieId')      // absent for TV (tmdb:tvId)
    const ratingStr = tag(it, 'letterboxd:memberRating')
    const rewatch = tag(it, 'letterboxd:rewatch')
    const title = tag(it, 'letterboxd:filmTitle')
    const yearStr = tag(it, 'letterboxd:filmYear')
    const linkM = it.match(/<link>https:\/\/letterboxd\.com\/[^/]+\/film\/([^/<]+)\/?/)
    const slug = linkM ? linkM[1] : null
    if (!watchedDate || !movieId || !title || !yearStr) continue // not a film-watch entry
    out.push({
      title,
      year: parseInt(yearStr, 10),
      slug,
      tmdbId: parseInt(movieId, 10),
      rating: ratingStr != null ? parseFloat(ratingStr) : null,
      watchedDate,
      rewatch: rewatch === 'Yes',
    })
  }
  return out
}

// Does a film already exist in the list? Match on TMDB id first (most reliable),
// then slug, then title+year.
function existsAlready(movies, c) {
  return movies.some(m =>
    (c.tmdbId != null && m.tmdbId === c.tmdbId) ||
    (c.slug && m.id === c.slug) ||
    (m.title === c.title && m.year === c.year)
  )
}

const data = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))

console.log(`Fetching ${RSS_URL} …`)
const res = await fetch(RSS_URL, { headers: { 'User-Agent': 'really-good-movies diary sync' } })
if (!res.ok) { console.error(`✗ Feed fetch failed: HTTP ${res.status}`); process.exit(1) }
const xml = await res.text()

const entries = parseFeed(xml)
console.log(`  ${entries.length} film-watch entries in feed`)

// Apply the criteria, then drop anything already in the list.
const dropped = { lowRating: 0, rewatch: 0, present: 0 }
const candidates = []
for (const e of entries) {
  if (e.rating == null || e.rating < MIN_RATING) { dropped.lowRating++; continue }
  if (SKIP_REWATCHES && e.rewatch) { dropped.rewatch++; continue }
  if (existsAlready(data.movies, e)) { dropped.present++; continue }
  // De-dupe within the feed itself (same film watched twice this window)
  if (candidates.some(c => c.tmdbId === e.tmdbId)) continue
  candidates.push(e)
}

console.log(
  `  filtered: ${dropped.lowRating} below ★${MIN_RATING}, ` +
  `${dropped.rewatch} rewatches, ${dropped.present} already in list`,
)
console.log(`\n${candidates.length} new film(s) to add:`)
for (const c of candidates) {
  console.log(`  • ${c.title} (${c.year})  ★${c.rating}  [tmdb ${c.tmdbId}]  watched ${c.watchedDate}`)
}

if (!candidates.length) { console.log('\nNothing to do.'); process.exit(0) }

if (!WRITE) {
  console.log('\n(DRY RUN — nothing written. Re-run with --write to enrich & append.)')
  process.exit(0)
}

// ── --write: enrich from TMDB and append (mirrors add-movies.mjs) ─────────────
const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('\n✗ --write needs TMDB_TOKEN (run with --env-file=.env)'); process.exit(1) }

const loadCache = p => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {})
const kwCachePath = join(root, 'data/tmdb-keywords-cache.json')
const castCachePath = join(root, 'data/tmdb-cast-cache.json')
const langCachePath = join(root, 'data/tmdb-language-cache.json')
const popCachePath = join(root, 'data/tmdb-popularity-cache.json')
const kwCache = loadCache(kwCachePath)
const castCache = loadCache(castCachePath)
const langCache = loadCache(langCachePath)
const popCache = loadCache(popCachePath)

async function tmdb(path) {
  const r = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`TMDB ${r.status}: ${path}`)
  return r.json()
}

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

console.log('\nEnriching from TMDB …')
const csvLines = []
for (const c of candidates) {
  try {
    const detail = await tmdb(`/movie/${c.tmdbId}?language=en-US`)
    const kwRaw = await tmdb(`/movie/${c.tmdbId}/keywords`)
    const credits = await tmdb(`/movie/${c.tmdbId}/credits?language=en-US`)
    const keywords = kwRaw.keywords?.map(k => k.name) || []
    const actors = credits.cast?.slice(0, 10).map(x => x.name) || []
    const director = credits.crew?.find(x => x.job === 'Director')?.name || null
    const id = c.slug || String(c.tmdbId)

    data.movies.push({
      id,
      title: c.title,
      year: c.year,
      rating: c.rating,
      watchedDate: c.watchedDate,
      letterboxdUri: `https://letterboxd.com/film/${id}`,
      genres: detail.genres?.map(g => g.name) || [],
      runtime: detail.runtime || null,
      synopsis: detail.overview || null,
      posterPath: detail.poster_path || null,
      director,
      moodTags: getMoodTags(c.year),
      tmdbId: c.tmdbId,
      moods: [], // derived by tag-moods.mjs
      keywords: keywords.slice(0, 20),
      voteCount: detail.vote_count ?? null,
      popularity: detail.popularity ?? null,
      actors,
      originalLanguage: detail.original_language ?? null,
      countries: (detail.production_countries || []).map(p => p.iso_3166_1),
    })

    kwCache[c.tmdbId] = keywords
    castCache[c.tmdbId] = actors
    langCache[c.tmdbId] = {
      originalLanguage: detail.original_language ?? null,
      countries: (detail.production_countries || []).map(p => p.iso_3166_1),
    }
    popCache[c.tmdbId] = { voteCount: detail.vote_count ?? null, popularity: detail.popularity ?? null }
    csvLines.push(`${c.watchedDate},${c.title.includes(',') ? `"${c.title}"` : c.title},${c.year},https://letterboxd.com/film/${id},${c.rating}`)

    console.log(`  ✓ ${c.title} (${c.year}) [tmdb ${c.tmdbId}] — ${director || 'n/a'}, ${detail.genres?.map(g => g.name).join('/') || 'no genres'}, poster=${detail.poster_path ? 'yes' : 'NO'}`)
  } catch (err) {
    console.error(`  ✗ ${c.title}: ${err.message}`)
  }
}

// Keep parse-csv's ordering: rating desc, then title
data.movies.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))

writeFileSync(kwCachePath, JSON.stringify(kwCache, null, 2))
writeFileSync(castCachePath, JSON.stringify(castCache, null, 2))
writeFileSync(langCachePath, JSON.stringify(langCache, null, 2))
writeFileSync(popCachePath, JSON.stringify(popCache, null, 2))
writeFileSync(MOVIES_PATH, JSON.stringify({ movies: data.movies, total: data.movies.length, generated: new Date().toISOString() }, null, 2))

// ratings.csv is a local-only source-of-truth (gitignored, absent in CI). Keep
// it in sync when it's there; the app only needs movies.json.
if (csvLines.length && existsSync(CSV_PATH)) {
  const csv = readFileSync(CSV_PATH, 'utf8')
  writeFileSync(CSV_PATH, csv.replace(/\n?$/, '\n') + csvLines.join('\n') + '\n')
}

console.log(`\n✓ ${csvLines.length} film(s) added (${data.movies.length} total).`)
console.log('Next: node --env-file=.env scripts/tag-moods.mjs  &&  node scripts/resize-posters.mjs')
