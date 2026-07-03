import { useState, useEffect, useCallback } from 'react'
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
  feel: ['devastating'], feeling: ['devastating'], something: ['devastating'],
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
  italian: ['languid', 'warm'], france: ['languid'], french: ['languid'],
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

  // y2k
  y2k: ['y2k'], '90s': ['y2k'], '2000s': ['y2k'], millennium: ['y2k'],
  nineties: ['y2k'], retro: ['y2k', 'warm'], vintage: ['y2k', 'warm'],
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
  musical: ['electric', 'warm'],
  western: ['epic'],
  mystery: ['tense', 'twisted'],
  fantasy: ['strange'],
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s\-']/g, ' ').split(/\s+/).filter(Boolean)
}

function scoreMovie(movie: Movie, query: string, targetMoods: Set<string>): number {
  let score = 0
  const tokens = tokenize(query)
  const titleLower = movie.title.toLowerCase()
  const directorLower = (movie.director || '').toLowerCase()
  const keywordsLower = movie.keywords.map(k => k.toLowerCase())
  const genresLower = movie.genres.map(g => g.toLowerCase())

  // Mood match — primary signal
  for (const mood of targetMoods) {
    if (movie.moods.includes(mood)) score += 4
  }

  // Title / director match
  for (const token of tokens) {
    if (token.length < 3) continue
    if (titleLower.includes(token)) score += 3
    if (directorLower.includes(token)) score += 3
    if (keywordsLower.some(k => k.includes(token))) score += 1
    if (genresLower.some(g => g.includes(token))) score += 2
  }

  // Decade match: "80s", "1990s" etc
  const fullQuery = query.toLowerCase()
  const decadeMatch = fullQuery.match(/\b(\d{2})s\b/) || fullQuery.match(/\b(\d{4})s?\b/)
  if (decadeMatch) {
    const raw = decadeMatch[1]
    const decade = raw.length === 2
      ? parseInt(raw) < 30 ? parseInt('20' + raw) * 10 : parseInt('19' + raw) * 10
      : Math.floor(parseInt(raw) / 10) * 10
    if (Math.floor(movie.year / 10) * 10 === decade) score += 3
  }

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

  const search = useCallback((query: string): Movie[] => {
    if (!query.trim() || allMovies.length === 0) return []

    const tokens = tokenize(query)
    const fullQuery = query.toLowerCase()
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
      .filter(m => targetMoods.size === 0 || m.moods.some(mood => targetMoods.has(mood)))
      .map(m => ({ movie: m, score: scoreMovie(m, query, targetMoods) }))
      .filter(({ score }) => score > 2)
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, 5).map(({ movie }) => movie)
  }, [allMovies])

  const random = useCallback((): Movie[] => {
    const pool = allMovies.filter(m => m.rating >= 4)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }, [allMovies])

  return { search, random, loading, total: allMovies.length }
}
