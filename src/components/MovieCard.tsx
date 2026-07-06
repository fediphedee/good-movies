import type { Movie } from '../hooks/useMovieSearch'
import { posterUrl } from '../lib/poster'

// Mobile single-movie view: one film at a time, poster-forward and centred.
// The "give me another" CTA sits directly under the poster so its position
// (the touch point) never shifts as the synopsis length varies.
export function MovieCard({ movie, onNext }: { movie: Movie; onNext?: () => void }) {
  const src = posterUrl(movie, 'w500')
  const poster = src ? (
    <img
      src={src}
      alt={movie.title}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  ) : (
    <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em' }}>NO POSTER</span>
  )

  return (
    <article
      key={movie.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '16px',
        padding: '24px 0 8px',
        opacity: 0,
        animation: 'fadeIn 0.3s ease forwards',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '300px',
          aspectRatio: '2 / 3',
          background: 'var(--divider)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {movie.letterboxdUri && src ? (
          <a
            href={movie.letterboxdUri}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${movie.title} on Letterboxd`}
            style={{ display: 'block', width: '100%', height: '100%' }}
          >
            {poster}
          </a>
        ) : (
          poster
        )}
      </div>

      {onNext && (
        <button
          onClick={onNext}
          style={{
            width: '100%',
            maxWidth: '300px',
            height: '48px',
            background: 'var(--fg)',
            color: 'var(--bg)',
            border: 'none',
            fontFamily: 'var(--font)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Give me another
        </button>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05, paddingTop: '16px' }}>
        {movie.title}
      </h2>

      <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <span>{movie.year}</span>
        {movie.director && <span>{movie.director}</span>}
      </div>

      {movie.synopsis && (
        <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '440px' }}>
          {movie.synopsis}
        </p>
      )}
    </article>
  )
}
