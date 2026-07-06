import { asset } from './asset'
import type { Movie } from '../hooks/useMovieSearch'

// ── Manual poster overrides ──────────────────────────────────────────
// For films/shows whose TMDB poster is wrong. To add one:
//   1. Drop the correct image into /public/poster-overrides/  (jpg/png/webp)
//   2. Add a line below: '<letterboxd-id>': '<filename>'
// The key is the film's Letterboxd id — the code in its boxd.it/<id> link
// (the poster in the app already links there), also the `id` field in
// public/movies.json.
//
// Example:
//   '2aqm': 'eight-and-a-half.jpg',
const OVERRIDES: Record<string, string> = {
  'jHWa': 'ema.jpg',                    // Ema (2019)
  'K7fI': 'scavengers-reign.jpg',       // Scavengers Reign (2023)
  'sG9O': 'station-eleven.jpg',         // Station Eleven (2021)
  'TvUy': 'Pee-wee_as_Himself.jpg',     // Pee-wee as Himself (2025)
  'nlQC': 'titane.jpg',                 // Titane (2021)
  'gACc': 'blue-planet-II.jpg',         // Blue Planet II (2017)
  '28Vi': 'frida.jpg',                  // Frida (2002)
  'lXFe': 'fanny-and-alexander.jpg',    // Fanny and Alexander (1982)
}


// Resolve a film's poster URL: a manual override if one exists, otherwise the
// TMDB image. Returns null when there's neither (caller shows a placeholder).
export function posterUrl(movie: Movie, size: 'w300' | 'w500' = 'w500'): string | null {
  const override = OVERRIDES[movie.id]
  if (override) return asset('/poster-overrides/' + override)
  return movie.posterPath ? `https://image.tmdb.org/t/p/${size}${movie.posterPath}` : null
}
