import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const csv = readFileSync(join(root, 'data/ratings.csv'), 'utf8')
const lines = csv.trim().split('\n').slice(1) // skip header

const movies = lines.map(line => {
  // handle commas inside quoted fields
  const parts = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { parts.push(current); current = ''; continue }
    current += ch
  }
  parts.push(current)

  const [date, name, year, uri, rating] = parts
  return {
    id: uri.split('/').pop(),
    title: name.trim(),
    year: parseInt(year),
    rating: parseFloat(rating),
    watchedDate: date,
    letterboxdUri: uri,
    // TMDB fields populated later
    genres: [],
    runtime: null,
    synopsis: null,
    posterPath: null,
    director: null,
    moodTags: [],
  }
}).filter(m => m.title && !isNaN(m.rating))

// Derive basic mood tags from decade + rating for now
// (will be replaced with TMDB genre data once API key is added)
function getMoodTags(movie) {
  const tags = []
  const decade = Math.floor(movie.year / 10) * 10

  if (decade <= 1950) tags.push('classic', 'old hollywood', 'black and white')
  if (decade >= 1960 && decade <= 1970) tags.push('new wave', 'sixties', 'counterculture')
  if (decade >= 1970 && decade <= 1980) tags.push('seventies', 'new hollywood', 'gritty')
  if (decade >= 1980 && decade <= 1990) tags.push('eighties', 'blockbuster era')
  if (decade >= 1990 && decade <= 2000) tags.push('nineties', 'indie boom')
  if (decade >= 2000 && decade <= 2010) tags.push('2000s')
  if (decade >= 2010) tags.push('contemporary', 'modern')

  return tags
}

const enriched = movies.map(m => ({ ...m, moodTags: getMoodTags(m) }))

// Sort: high-rated first, then alphabetical
enriched.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))

writeFileSync(
  join(root, 'public/movies.json'),
  JSON.stringify({ movies: enriched, total: enriched.length, generated: new Date().toISOString() }, null, 2)
)

console.log(`✓ Wrote ${enriched.length} movies to public/movies.json`)
