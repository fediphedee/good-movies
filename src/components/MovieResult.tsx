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

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: '0 24px',
        borderBottom: '1px solid var(--divider)',
        opacity: 0,
        animation: `fadeUp 0.3s ease forwards`,
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Poster slot — links to the film on Letterboxd, zooms within frame on hover */}
      <div
        className="rgm-poster"
        style={{
          aspectRatio: '2/3',
          background: 'var(--divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '20px 0 20px 0',
          flexShrink: 0,
          overflow: 'hidden',
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

      {/* Info */}
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {movie.title}
        </h2>

        <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '14px' }}>
          <span>{movie.year}</span>
          {movie.director && <span>{movie.director}</span>}
        </div>

        {movie.synopsis && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7, marginTop: '4px' }}>
            {movie.synopsis.slice(0, 180)}{movie.synopsis.length > 180 ? '…' : ''}
          </p>
        )}
      </div>
    </article>
  )
}
