import type { Movie } from '../hooks/useMovieSearch'
import { posterUrl } from '../lib/poster'

interface MovieResultProps {
  movie: Movie
  index: number
}

export function MovieResult({ movie, index }: MovieResultProps) {
  const src = posterUrl(movie, 'w300')
  const poster = src ? (
    <img
      className="rgm-poster-img"
      src={src}
      alt={movie.title}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  ) : (
    <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em', textAlign: 'center', padding: '8px' }}>
      NO<br />POSTER
    </span>
  )

  const href = movie.letterboxdUri

  // Poster is 30% larger than before (120px → 156px wide)
  const cardStyle = {
    display: 'grid',
    gridTemplateColumns: '156px 1fr',
    gap: '0 24px',
    alignItems: 'start',
    padding: '16px',
    // base border lives in CSS (.rgm-card) so the :hover outline can override it
    color: 'var(--fg)',
    opacity: 0,
    animation: 'fadeUp 0.3s ease forwards',
    animationDelay: `${index * 80}ms`,
  } as const

  const inner = (
    <>
      {/* Poster slot — zooms within its frame on card hover */}
      <div
        className="rgm-poster"
        style={{
          aspectRatio: '2/3',
          background: 'var(--divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {poster}
      </div>

      {/* Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {movie.title}
        </h2>

        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '14px' }}>
          <span>{movie.year}</span>
          {movie.director && <span>{movie.director}</span>}
        </div>

        {movie.synopsis && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7, marginTop: '4px' }}>
            {movie.synopsis.slice(0, 180)}{movie.synopsis.length > 180 ? '…' : ''}
          </p>
        )}

        {/* Hover-only link cue: an up-right arrow + a call to read reviews */}
        {href && (
          <span
            className="rgm-card-link"
            style={{
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
              letterSpacing: '0.04em',
              color: 'var(--fg)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M3.5 8.5 8.5 3.5M8.5 3.5H4M8.5 3.5V8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            see what people say
          </span>
        )}
      </div>
    </>
  )

  // The whole card is the link (content included). Films without a Letterboxd
  // URL render as a plain, non-clickable card.
  return href ? (
    <a
      className="rgm-card"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${movie.title} on Letterboxd`}
      style={cardStyle}
    >
      {inner}
    </a>
  ) : (
    <article className="rgm-card" style={cardStyle}>
      {inner}
    </article>
  )
}
