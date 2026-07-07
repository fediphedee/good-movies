import { useState, useEffect, useCallback, useMemo } from 'react'
import { asset } from '../lib/asset'

export interface Movie {
  id: string
  title: string
  year: number
  rating: number
  watchedDate: string
  letterboxdUri: string
  genres: string[]
  runtime: number | null
  synopsis: string | null
  posterPath: string | null
  director: string | null
  moods: string[]
  keywords: string[]
  moodTags: string[]
  voteCount: number | null
  popularity: number | null
  actors: string[]
  originalLanguage: string | null
  countries: string[]
}

interface MoviesData {
  movies: Movie[]
  total: number
  generated: string
}

// User input words → mood slugs
const MOOD_TRIGGERS: Record<string, string[]> = {
  // devastating
  sad: ['devastating'], cry: ['devastating'], crying: ['devastating'],
  emotional: ['devastating'], heavy: ['devastating'], heartbreak: ['devastating'],
  gutting: ['devastating'], tragic: ['devastating'], devastat: ['devastating'],
  'feel something': ['devastating'], 'want to feel': ['devastating'],
  meaningful: ['devastating', 'cerebral'], profound: ['devastating', 'cerebral'],

  // cerebral
  smart: ['cerebral'], clever: ['cerebral'], think: ['cerebral'],
  philosophical: ['cerebral'], puzzle: ['cerebral'], complex: ['cerebral'],
  mindfuck: ['cerebral'], layer: ['cerebral'], deep: ['cerebral'],
  intellectual: ['cerebral'],

  // electric
  stylish: ['electric'], cool: ['electric'], kinetic: ['electric'],
  slick: ['electric'], visual: ['electric'], energetic: ['electric'],
  exciting: ['electric'], fast: ['electric'],

  // funny-dark
  dark: ['funny-dark', 'gothic'], satire: ['funny-dark'], satirical: ['funny-dark'],
  absurd: ['funny-dark', 'strange'], uncomfortable: ['funny-dark'],
  twisted: ['twisted', 'funny-dark'],

  // late-night
  atmospheric: ['late-night', 'gothic'], moody: ['late-night'],
  noir: ['late-night', 'tense'], '3am': ['late-night'],
  insomnia: ['late-night'], sleepless: ['late-night'], slow: ['late-night', 'languid'],
  contemplative: ['late-night', 'cerebral'],

  // warm
  nostalgic: ['warm', 'y2k'], nostalgia: ['warm', 'y2k'],
  comfort: ['warm'], comforting: ['warm'], gentle: ['warm'],
  heartwarming: ['warm'], cozy: ['warm'], hopeful: ['warm'],
  'feel-good': ['warm', 'breezy'], feelgood: ['warm', 'breezy'],

  // tense
  tense: ['tense'], suspense: ['tense'], suspenseful: ['tense'],
  gripping: ['tense'], thriller: ['tense'], intense: ['tense'],
  'edge-of-seat': ['tense'], 'edge of seat': ['tense'],
  paranoia: ['tense', 'cerebral'], paranoid: ['tense', 'cerebral'],

  // epic
  epic: ['epic'], grand: ['epic'], sweeping: ['epic'],
  historical: ['epic'], long: ['epic'], big: ['epic'],

  // strange
  surreal: ['strange'], weird: ['strange'], dreamlike: ['strange'],
  dream: ['strange'], experimental: ['strange'], odd: ['strange'],
  bizarre: ['strange'], uncanny: ['strange'],

  // sharp
  short: ['sharp'], quick: ['sharp'], tight: ['sharp'],
  '90min': ['sharp'], 'under 90': ['sharp'],

  // twisted
  twist: ['twisted'], 'plot twist': ['twisted'], shocking: ['twisted'],
  'didn\'t see it coming': ['twisted'], unpredictable: ['twisted'],
  reveal: ['twisted'],

  // gothic
  gothic: ['gothic'], unsettling: ['gothic'], dread: ['gothic'],
  creepy: ['gothic'], ominous: ['gothic'], sinister: ['gothic'],
  horror: ['gothic', 'tense'], haunting: ['gothic'],

  // languid
  languid: ['languid'], summer: ['languid'], unhurried: ['languid'],
  talkative: ['languid'], conversation: ['languid'],
  'woody allen': ['languid', 'funny-dark'], woody: ['languid'],
  mediterranean: ['languid'], vacation: ['languid'],

  // breezy
  fun: ['breezy'], funny: ['breezy', 'funny-dark'], light: ['breezy'],
  easy: ['breezy'], laugh: ['breezy'], comedy: ['breezy'],
  romantic: ['breezy', 'warm'], romcom: ['breezy'],

  // mumblecore
  mumblecore: ['mumblecore'], indie: ['mumblecore'], 'lo-fi': ['mumblecore'],
  naturalistic: ['mumblecore'], talking: ['mumblecore', 'languid'],
  relationship: ['mumblecore', 'devastating'], 'slice of life': ['mumblecore', 'languid'],

  // y2k (aesthetic mood — literal decade numbers are handled by parseDecade)
  y2k: ['y2k'], millennium: ['y2k'],
  retro: ['y2k', 'warm'],
}

// Genre labels → mood slugs (for "something horror", "a comedy" etc)
const GENRE_TRIGGERS: Record<string, string[]> = {
  horror: ['gothic', 'tense'],
  comedy: ['breezy', 'funny-dark'],
  romance: ['warm', 'languid'],
  drama: ['devastating', 'cerebral'],
  thriller: ['tense'],
  crime: ['tense', 'electric'],
  action: ['electric'],
  scifi: ['cerebral'],
  'sci-fi': ['cerebral'],
  documentary: ['cerebral'],
  animation: ['warm', 'breezy'],
  western: ['epic'],
  mystery: ['tense', 'twisted'],
  fantasy: ['strange'],
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s\-']/g, ' ').split(/\s+/).filter(Boolean)
}

// Parse a requested decade from the query → its starting year (e.g. 1980), or
// null. Handles "1980s"/"1980", "80s", and written forms like "eighties".
function parseDecade(query: string): number | null {
  const q = query.toLowerCase()

  // Four-digit year, optionally with a trailing "s": 1980, 1980s, 2000s
  const m4 = q.match(/\b(?:19|20)\d{2}s?\b/)
  if (m4) return Math.floor(parseInt(m4[0], 10) / 10) * 10

  // Written decades
  const words: Record<string, number> = {
    twenties: 1920, thirties: 1930, forties: 1940, fifties: 1950,
    sixties: 1960, seventies: 1970, eighties: 1980, nineties: 1990,
    noughties: 2000, aughts: 2000,
  }
  for (const [w, d] of Object.entries(words)) if (q.includes(w)) return d

  // Two-digit shorthand: 80s, 90s, 00s, 20s (00–29 → 2000s, 30–99 → 1900s)
  const m2 = q.match(/\b(\d{2})s\b/)
  if (m2) {
    const n = parseInt(m2[1], 10)
    return n < 30 ? 2000 + n : 1900 + n
  }

  return null
}

// Fame cues → is the user asking for obscure or famous films? Multi-word cues
// are matched as phrases; single words with a word boundary (so "cult" doesn't
// hit "culture"). If the query mixes both, we treat it as ambiguous (null).
const OBSCURE_CUES = [
  'obscure', 'hidden gem', 'hidden', 'underrated', 'deep cut', 'deep-cut',
  'under the radar', 'lesser known', 'lesser-known', 'underseen', 'under-seen',
  'overlooked', 'forgotten', 'niche', 'cult', 'indie gem', 'unknown',
]
const FAMOUS_CUES = [
  'famous', 'popular', 'well known', 'well-known', 'iconic',
  'mainstream', 'blockbuster', 'everyone', 'crowd pleaser', 'crowd-pleaser',
  'beloved', 'big hit',
]

// "classic" / "old" / "vintage" → older films only (1980 or earlier).
const CLASSIC_MAX_YEAR = 1980
const wantsClassic = (q: string) => /\b(classics?|old|vintage)\b/.test(q)

// "musical" → real musicals only (Music genre or a "musical" keyword), so
// non-musical animated/Disney films don't leak in via mood.
const wantsMusical = (q: string) => /\bmusicals?\b/.test(q)
const isMusical = (m: Movie) =>
  m.genres.includes('Music') || m.keywords.some(k => k.toLowerCase().includes('musical'))

// "happy" / "laugh" → comedies only (hard genre filter).
const wantsComedy = (q: string) => /\b(happy|laugh(s|ing)?)\b/.test(q)

// Christmas films are hidden unless the query is explicitly festive; then only
// they show. Matched on the "christmas" keyword.
const CHRISTMAS_CUES = ['christmas', 'xmas', 'festive', 'winter']
const wantsChristmas = (q: string) => CHRISTMAS_CUES.some(c => matchesCue(c, q))
const isChristmasFilm = (m: Movie) => m.keywords.some(k => k.toLowerCase().includes('christmas'))

function matchesCue(cue: string, fullQuery: string): boolean {
  return cue.includes(' ')
    ? fullQuery.includes(cue)
    : new RegExp(`\\b${cue}\\b`).test(fullQuery)
}

function detectFame(fullQuery: string): 'obscure' | 'famous' | null {
  const obscure = OBSCURE_CUES.some(c => matchesCue(c, fullQuery))
  const famous = FAMOUS_CUES.some(c => matchesCue(c, fullQuery))
  if (obscure && !famous) return 'obscure'
  if (famous && !obscure) return 'famous'
  return null
}

// Nationality/language cues → TMDB original-language code and/or production
// country. A film matches if its language OR a production country matches, so
// "italian" catches both Italian-language films and Italy-made ones.
interface LangCue { lang?: string; country?: string }
const LANGUAGE_TRIGGERS: Record<string, LangCue> = {
  italian: { lang: 'it', country: 'IT' }, italy: { lang: 'it', country: 'IT' },
  // French films are French-language; France co-produces a lot of foreign
  // cinema, so country FR is too noisy — match by language only.
  french: { lang: 'fr' }, france: { lang: 'fr' },
  japanese: { lang: 'ja', country: 'JP' }, japan: { lang: 'ja', country: 'JP' },
  korean: { lang: 'ko', country: 'KR' }, korea: { lang: 'ko', country: 'KR' },
  spanish: { lang: 'es' }, spain: { lang: 'es', country: 'ES' },
  mexican: { lang: 'es', country: 'MX' }, mexico: { country: 'MX' },
  german: { lang: 'de' }, germany: { lang: 'de', country: 'DE' },
  chinese: { lang: 'zh' }, china: { lang: 'zh', country: 'CN' },
  mandarin: { lang: 'zh' }, cantonese: { lang: 'cn' },
  'hong kong': { country: 'HK' },
  hindi: { lang: 'hi' }, indian: { lang: 'hi', country: 'IN' }, india: { country: 'IN' },
  russian: { lang: 'ru' }, russia: { lang: 'ru', country: 'RU' },
  swedish: { lang: 'sv' }, sweden: { lang: 'sv', country: 'SE' },
  danish: { lang: 'da' }, denmark: { lang: 'da', country: 'DK' },
  norwegian: { lang: 'no' }, norway: { lang: 'no', country: 'NO' },
  portuguese: { lang: 'pt' }, brazilian: { lang: 'pt', country: 'BR' }, brazil: { country: 'BR' },
  polish: { lang: 'pl' }, poland: { lang: 'pl', country: 'PL' },
  iranian: { lang: 'fa', country: 'IR' }, iran: { lang: 'fa', country: 'IR' },
  greek: { lang: 'el' }, greece: { country: 'GR' },
  turkish: { lang: 'tr' }, turkey: { country: 'TR' },
  thai: { lang: 'th' }, thailand: { country: 'TH' },
  argentine: { lang: 'es', country: 'AR' }, argentina: { country: 'AR' },
  british: { country: 'GB' }, english: { lang: 'en' }, american: { country: 'US' },
}

// Collect requested languages + countries from the query.
function detectLangCountry(tokens: string[], fullQuery: string) {
  const langs = new Set<string>()
  const countries = new Set<string>()
  const add = (cue: LangCue) => {
    if (cue.lang) langs.add(cue.lang)
    if (cue.country) countries.add(cue.country)
  }
  for (const token of tokens) if (LANGUAGE_TRIGGERS[token]) add(LANGUAGE_TRIGGERS[token])
  for (const [phrase, cue] of Object.entries(LANGUAGE_TRIGGERS)) {
    if (phrase.includes(' ') && fullQuery.includes(phrase)) add(cue)
  }
  return { langs, countries }
}

// Theme/subject cues → the TMDB keyword to hard-filter on. Curated from the
// library's actual top keywords so matches are clean (no credits-stinger noise).
const THEME_TRIGGERS: Record<string, string> = {
  murder: 'murder', killing: 'murder',
  revenge: 'revenge',
  heist: 'heist',
  space: 'space',
  'coming of age': 'coming of age', 'coming-of-age': 'coming of age',
  superhero: 'superhero', superheroes: 'superhero',
  lgbt: 'lgbt', gay: 'gay', lesbian: 'lgbt', queer: 'lgbt',
  dystopia: 'dystopia', dystopian: 'dystopia',
  witch: 'witch', witches: 'witch',
  vampire: 'vampire', vampires: 'vampire',
  zombie: 'zombie', zombies: 'zombie',
  alien: 'alien', aliens: 'alien',
  'time travel': 'time travel',
  'high school': 'high school',
  wedding: 'wedding', weddings: 'wedding',
  'road trip': 'road trip', 'road movie': 'road trip',
  magic: 'magic', magical: 'magic',
  obsession: 'obsession',
  infidelity: 'infidelity', affair: 'infidelity', cheating: 'infidelity',
  'serial killer': 'serial killer',
  'mental illness': 'mental illness',
  addiction: 'drugs', drugs: 'drugs',
  pregnancy: 'pregnancy', pregnant: 'pregnancy',
  biography: 'biography', biopic: 'biography',
  friendship: 'friendship',
  'new york': 'new york city',
  paris: 'paris, france',
  london: 'london, england',
  wwii: 'world war ii', 'world war': 'world war',
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Collect requested theme keywords from the query.
function detectThemes(fullQuery: string): Set<string> {
  const out = new Set<string>()
  for (const [cue, keyword] of Object.entries(THEME_TRIGGERS)) {
    if (matchesCue(cue, fullQuery)) out.add(keyword)
  }
  return out
}

// Black-and-white request → hard-filter to films tagged with the TMDB
// "black and white" keyword.
const BW_CUES = ['black and white', 'black & white', 'black-and-white', 'b&w', 'b & w', 'b and w', 'monochrome']
function wantsBlackAndWhite(fullQuery: string): boolean {
  return BW_CUES.some(c => fullQuery.includes(c))
}

function scoreMovie(movie: Movie, query: string, targetMoods: Set<string>): number {
  let score = 0
  const tokens = tokenize(query)
  const namesLower = [movie.director, ...movie.actors].filter(Boolean).join(' | ').toLowerCase()
  const keywordsLower = movie.keywords.map(k => k.toLowerCase())
  const genresLower = movie.genres.map(g => g.toLowerCase())

  // Mood match — primary signal
  for (const mood of targetMoods) {
    if (movie.moods.includes(mood)) score += 4
  }

  // Cast / director / keyword / genre match (film titles intentionally excluded)
  for (const token of tokens) {
    if (token.length < 3) continue
    if (namesLower.includes(token)) score += 3
    if (keywordsLower.some(k => k.includes(token))) score += 1
    if (genresLower.some(g => g.includes(token))) score += 2
  }

  // Decade is applied as a hard filter in search(); no scoring needed here.
  const fullQuery = query.toLowerCase()

  // Runtime cues
  if (/\bshort\b|\bquick\b|under 90|90 min/.test(fullQuery) && movie.runtime && movie.runtime < 90) score += 3
  if (/\blong\b|\bepic\b/.test(fullQuery) && movie.runtime && movie.runtime > 150) score += 2

  // Boost by personal rating — your taste IS the filter
  score += movie.rating * 0.8

  return score
}

export function useMovieSearch() {
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(asset('/movies.json'))
      .then(r => r.json())
      .then((data: MoviesData) => { setAllMovies(data.movies); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Strict-edge fame thresholds: bottom 15% of vote counts = obscure ceiling,
  // top 15% = famous floor. Computed from the collection so it stays adaptive.
  const fame = useMemo(() => {
    const counts = allMovies
      .map(m => m.voteCount)
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b)
    if (counts.length < 20) return null
    const at = (p: number) => counts[Math.floor((counts.length - 1) * p)]
    return { obscureMax: at(0.15), famousMin: at(0.85) }
  }, [allMovies])

  const search = useCallback((query: string): Movie[] => {
    if (!query.trim() || allMovies.length === 0) return []

    const tokens = tokenize(query)
    const fullQuery = query.toLowerCase()
    const decade = parseDecade(query)
    const wantFame = fame ? detectFame(fullQuery) : null
    const { langs, countries } = detectLangCountry(tokens, fullQuery)
    const bw = wantsBlackAndWhite(fullQuery)
    const themes = detectThemes(fullQuery)
    const classic = wantsClassic(fullQuery)
    const festive = wantsChristmas(fullQuery)
    const musical = wantsMusical(fullQuery)
    const comedy = wantsComedy(fullQuery)
    // "…I haven't seen" → surface obscure picks first (ascending popularity)
    const obscureFirst = /haven'?t\s+(seen|watched|heard)|never\s+seen|unseen|underseen/.test(fullQuery)
    const targetMoods = new Set<string>()

    // Map query words → moods
    for (const token of tokens) {
      const m = MOOD_TRIGGERS[token]
      if (m) m.forEach(x => targetMoods.add(x))
      const g = GENRE_TRIGGERS[token]
      if (g) g.forEach(x => targetMoods.add(x))
    }

    // Also check multi-word phrases
    for (const [phrase, moods] of Object.entries(MOOD_TRIGGERS)) {
      if (phrase.includes(' ') && fullQuery.includes(phrase)) {
        moods.forEach(x => targetMoods.add(x))
      }
    }

    const scored = allMovies
      .filter(m => m.rating >= 3)
      .filter(m => decade === null || Math.floor(m.year / 10) * 10 === decade)
      .filter(m => {
        if (langs.size === 0 && countries.size === 0) return true
        return (m.originalLanguage !== null && langs.has(m.originalLanguage)) ||
          m.countries.some(c => countries.has(c))
      })
      .filter(m => {
        if (!wantFame || !fame) return true
        if (typeof m.voteCount !== 'number') return false
        return wantFame === 'obscure'
          ? m.voteCount <= fame.obscureMax
          : m.voteCount >= fame.famousMin
      })
      .filter(m => !bw || m.keywords.some(k => k.toLowerCase().includes('black and white')))
      // classic = 1980 or earlier
      .filter(m => !classic || m.year <= CLASSIC_MAX_YEAR)
      // christmas films only surface for festive queries; hidden otherwise
      .filter(m => (festive ? isChristmasFilm(m) : !isChristmasFilm(m)))
      // "musical" → real musicals only
      .filter(m => !musical || isMusical(m))
      // "happy" / "laugh" → comedies only
      .filter(m => !comedy || m.genres.includes('Comedy'))
      .filter(m => {
        if (themes.size === 0) return true
        return m.keywords.some(k => {
          const kl = k.toLowerCase()
          return [...themes].some(t => new RegExp(`\\b${escapeRegex(t)}\\b`).test(kl))
        })
      })
      .filter(m => targetMoods.size === 0 || m.moods.some(mood => targetMoods.has(mood)))
      // Small random jitter (< the 0.4 half-star step) so tied films — e.g. all
      // the 5★ ones when nothing in the query is recognised — shuffle instead of
      // always resolving to alphabetical order.
      .map(m => ({ movie: m, score: scoreMovie(m, query, targetMoods) + Math.random() * 0.35 }))
      .filter(({ score }) => score > 2)
      .sort((a, b) => obscureFirst
        ? ((a.movie.voteCount ?? Infinity) - (b.movie.voteCount ?? Infinity)) || (Math.random() - 0.5)
        : b.score - a.score)

    return scored.map(({ movie }) => movie)
  }, [allMovies, fame])

  const random = useCallback((): Movie[] => {
    const pool = allMovies.filter(m => m.rating >= 4)
    return [...pool].sort(() => Math.random() - 0.5)
  }, [allMovies])

  return { search, random, loading, total: allMovies.length }
}
