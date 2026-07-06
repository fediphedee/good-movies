import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TOKEN = process.env.TMDB_TOKEN
if (!TOKEN) { console.error('Missing TMDB_TOKEN'); process.exit(1) }

// ── Keyword → mood mapping ────────────────────────────────────────
// Keys are lowercase substrings matched against TMDB keyword names
const KEYWORD_MOODS = {
  // devastating
  'grief': ['devastating'],
  'loss of loved one': ['devastating'],
  'death of': ['devastating'],
  'terminal illness': ['devastating'],
  'suicide': ['devastating'],
  'war trauma': ['devastating', 'epic'],
  'heartbreak': ['devastating'],
  'bereavement': ['devastating'],
  'mourning': ['devastating'],
  'depression': ['devastating'],
  'abuse': ['devastating'],
  'holocaust': ['devastating', 'epic'],
  'slavery': ['devastating', 'epic'],
  'tragedy': ['devastating'],
  'tear-jerker': ['devastating'],

  // cerebral
  'philosophy': ['cerebral'],
  'existentialism': ['cerebral', 'late-night'],
  'time travel': ['cerebral'],
  'parallel universe': ['cerebral'],
  'unreliable narrator': ['cerebral', 'twisted'],
  'nonlinear': ['cerebral', 'twisted'],
  'meta': ['cerebral', 'funny-dark'],
  'consciousness': ['cerebral'],
  'identity': ['cerebral'],
  'artificial intelligence': ['cerebral'],
  'memory': ['cerebral'],
  'psychological': ['cerebral', 'tense'],
  'mind game': ['cerebral', 'twisted'],
  'dystopia': ['cerebral'],
  'satire': ['cerebral', 'funny-dark'],

  // electric
  'heist': ['electric', 'tense'],
  'car chase': ['electric'],
  'stylized': ['electric'],
  'neo-noir': ['electric', 'late-night'],
  'music': ['electric'],
  'dance': ['electric'],
  'gangster': ['electric', 'tense'],
  'crime boss': ['electric', 'tense'],
  'revenge': ['electric', 'tense'],
  'adrenaline': ['electric'],
  'action hero': ['electric'],
  'martial arts': ['electric'],

  // funny-dark
  'dark comedy': ['funny-dark'],
  'black comedy': ['funny-dark'],
  'absurdism': ['funny-dark', 'strange'],
  'gallows humor': ['funny-dark'],
  'parody': ['funny-dark', 'breezy'],
  'slapstick': ['funny-dark', 'breezy'],
  'irony': ['funny-dark'],
  'workplace comedy': ['funny-dark', 'breezy'],
  'social satire': ['funny-dark', 'cerebral'],

  // late-night
  'film noir': ['late-night', 'tense'],
  'insomnia': ['late-night'],
  'loneliness': ['late-night', 'devastating'],
  'alienation': ['late-night', 'devastating'],
  'city at night': ['late-night'],
  'jazz': ['late-night', 'languid'],
  'melancholy': ['late-night', 'devastating'],
  'introspection': ['late-night', 'cerebral'],
  'road movie': ['late-night'],
  'drifter': ['late-night'],
  'ennui': ['late-night', 'languid'],
  'wandering': ['late-night', 'languid'],

  // warm
  'friendship': ['warm'],
  'found family': ['warm'],
  'coming-of-age': ['warm'],
  'reunion': ['warm'],
  'small town': ['warm'],
  'heartwarming': ['warm'],
  'community': ['warm'],
  'childhood': ['warm'],
  'nostalgia': ['warm', 'y2k'],
  'summer camp': ['warm'],
  'mentor': ['warm'],

  // tense
  'thriller': ['tense'],
  'suspense': ['tense'],
  'cat and mouse': ['tense', 'twisted'],
  'paranoia': ['tense', 'cerebral'],
  'chase': ['tense', 'electric'],
  'kidnapping': ['tense'],
  'serial killer': ['tense', 'gothic'],
  'espionage': ['tense'],
  'conspiracy': ['tense', 'cerebral'],
  'survival': ['tense'],
  'hostage': ['tense'],
  'whodunit': ['tense', 'twisted'],
  'detective': ['tense'],
  'interrogation': ['tense'],

  // epic
  'war': ['epic'],
  'historical': ['epic'],
  'period piece': ['epic'],
  'empire': ['epic'],
  'saga': ['epic'],
  'biopic': ['epic'],
  'revolution': ['epic'],
  'medieval': ['epic'],
  'ancient': ['epic'],
  'world war': ['epic', 'devastating'],
  'battle': ['epic'],

  // strange
  'surrealism': ['strange'],
  'dream': ['strange'],
  'magical realism': ['strange'],
  'avant-garde': ['strange'],
  'experimental': ['strange'],
  'body horror': ['strange', 'gothic'],
  'hallucination': ['strange'],
  'supernatural': ['strange', 'gothic'],
  'kafka': ['strange', 'cerebral'],
  'absurd': ['strange', 'funny-dark'],
  'fantastique': ['strange'],
  'mythological': ['strange', 'epic'],

  // sharp (runtime-based, supplemented by tone)
  'bottle film': ['sharp'],
  'single location': ['sharp'],
  'minimalist': ['sharp'],
  'real time': ['sharp'],

  // twisted
  'plot twist': ['twisted'],
  'twist ending': ['twisted'],
  'double cross': ['twisted'],
  'identity reveal': ['twisted'],
  'shocking': ['twisted'],
  'deception': ['twisted'],
  'betrayal': ['twisted', 'tense'],
  'con artist': ['twisted', 'electric'],
  'unreliable': ['twisted', 'cerebral'],

  // gothic
  'gothic': ['gothic'],
  'haunted house': ['gothic'],
  'victorian': ['gothic'],
  'southern gothic': ['gothic'],
  'atmospheric horror': ['gothic'],
  'psychological horror': ['gothic', 'cerebral'],
  'dread': ['gothic'],
  'dark atmosphere': ['gothic', 'late-night'],
  'cult': ['gothic', 'strange'],
  'occult': ['gothic', 'strange'],
  'vampire': ['gothic'],
  'witch': ['gothic', 'strange'],

  // languid
  'summer': ['languid'],
  'vacation': ['languid'],
  'slice of life': ['languid', 'mumblecore'],
  'conversation': ['languid'],
  'talkative': ['languid'],
  'french new wave': ['languid', 'cerebral'],
  'italian neorealism': ['languid', 'warm'],
  'mediterranean': ['languid'],
  'slow cinema': ['languid', 'cerebral'],
  'observational': ['languid'],
  'dialogue-driven': ['languid', 'mumblecore'],
  'european art film': ['languid', 'cerebral'],

  // breezy
  'romantic comedy': ['breezy', 'warm'],
  'feel-good': ['breezy', 'warm'],
  'family film': ['breezy'],
  'lighthearted': ['breezy'],
  'fun': ['breezy'],
  'screwball': ['breezy', 'funny-dark'],
  'buddy': ['breezy', 'warm'],
  'road trip comedy': ['breezy'],
  'holiday': ['breezy', 'warm'],

  // mumblecore
  'mumblecore': ['mumblecore'],
  'naturalistic': ['mumblecore', 'languid'],
  'low budget': ['mumblecore'],
  'improvised': ['mumblecore'],
  'indie': ['mumblecore'],
  'twenty-something': ['mumblecore', 'languid'],
  'new york city': ['mumblecore', 'languid'],
  'relationship drama': ['mumblecore', 'devastating'],
  'awkward': ['mumblecore'],

  // y2k
  'millennium': ['y2k'],
  'dot-com': ['y2k'],
  'early internet': ['y2k'],
  'hacker': ['y2k', 'cerebral'],
  '1990s': ['y2k'],
  '2000s': ['y2k'],
  'pager': ['y2k'],
  'disco era': ['y2k'],
  'grunge': ['y2k'],
  'rave': ['y2k', 'electric'],
}

// Genre → mood fallbacks (when keywords are sparse)
const GENRE_MOODS = {
  'Horror':       ['gothic'],
  'Thriller':     ['tense'],
  'Mystery':      ['tense', 'twisted'],
  'Crime':        ['tense', 'electric'],
  'Action':       ['electric'],
  'Comedy':       ['breezy'],
  'Romance':      ['warm'],
  'Drama':        [],
  'Documentary':  ['cerebral'],
  'Animation':    ['warm', 'breezy'],
  'Musical':      ['electric', 'warm'],
  'Western':      ['epic'],
  'War':          ['epic', 'devastating'],
  'Sci-Fi':       ['cerebral'],
  'Science Fiction': ['cerebral'],
  'Fantasy':      ['strange'],
  'History':      ['epic'],
  'Family':       ['breezy', 'warm'],
  'Music':        ['electric'],
  'Adventure':    ['electric', 'breezy'],
}

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function keywordsToMoods(keywords, genres, runtime) {
  const moodSet = new Set()

  // Match keywords: the pattern must appear as a whole word/phrase in the
  // keyword (word boundaries), so "warehouse" no longer matches "war".
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase()
    for (const [pattern, moods] of Object.entries(KEYWORD_MOODS)) {
      if (new RegExp(`\\b${escapeRegex(pattern)}\\b`).test(kwLower)) {
        moods.forEach(m => moodSet.add(m))
      }
    }
  }

  // Genre fallbacks if keywords gave us nothing
  if (moodSet.size < 2) {
    for (const genre of genres) {
      const gm = GENRE_MOODS[genre] || []
      gm.forEach(m => moodSet.add(m))
    }
  }

  // Runtime-based sharp tag
  if (runtime && runtime < 90) moodSet.add('sharp')

  return [...moodSet].slice(0, 5) // cap at 5
}

// ── Main ─────────────────────────────────────────────────────────
const KW_CACHE_PATH = join(root, 'data/tmdb-keywords-cache.json')
const MOVIES_PATH = join(root, 'public/movies.json')

const kwCache = existsSync(KW_CACHE_PATH)
  ? JSON.parse(readFileSync(KW_CACHE_PATH, 'utf8'))
  : {}

const { movies } = JSON.parse(readFileSync(MOVIES_PATH, 'utf8'))

const toFetch = movies.filter(m => m.tmdbId && !kwCache[m.tmdbId])
console.log(`Fetching keywords for ${toFetch.length} films (${movies.length - toFetch.length} cached)…`)

let done = 0
let failed = 0

// Process in batches of 20 concurrent
for (let i = 0; i < toFetch.length; i += 20) {
  const batch = toFetch.slice(i, i + 20)
  await Promise.all(batch.map(async m => {
    try {
      const data = await tmdb(`/movie/${m.tmdbId}/keywords`)
      kwCache[m.tmdbId] = data.keywords?.map(k => k.name) || []
      done++
    } catch {
      kwCache[m.tmdbId] = []
      failed++
    }
  }))

  if (i % 100 === 0 && i > 0) {
    process.stdout.write(`  ${done}/${toFetch.length}\n`)
    writeFileSync(KW_CACHE_PATH, JSON.stringify(kwCache, null, 2))
  }

  if (i + 20 < toFetch.length) await new Promise(r => setTimeout(r, 250))
}

// Apply moods
movies.forEach(m => {
  const keywords = m.tmdbId ? (kwCache[m.tmdbId] || []) : []
  m.moods = keywordsToMoods(keywords, m.genres, m.runtime)
  m.keywords = keywords.slice(0, 20) // keep top 20 keywords for search
})

writeFileSync(KW_CACHE_PATH, JSON.stringify(kwCache, null, 2))
writeFileSync(
  MOVIES_PATH,
  JSON.stringify({ movies, total: movies.length, generated: new Date().toISOString() }, null, 2)
)

console.log(`\n✓ Done: ${done} fetched, ${failed} failed`)

// Quick sanity check
const sample = movies.find(m => m.title === 'Amarcord')
console.log(`\nSample — Amarcord: moods=${JSON.stringify(sample?.moods)}, keywords=${sample?.keywords?.slice(0,5).join(', ')}`)

const languid = movies.filter(m => m.moods.includes('languid') && m.rating >= 4).slice(0, 5)
console.log(`\nTop languid films (4★+): ${languid.map(m => m.title).join(', ')}`)
