import type { Movie } from '../hooks/useMovieSearch'

interface MovieResultProps {
  movie: Movie
  index: number
}

export function MovieResult({ movie, index }: MovieResultProps) {
  const stars = '★'.repeat(Math.floor(movie.rating)) + (movie.rating % 1 ? '½' : '')

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
      {/* Poster slot */}
      <div
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
        {movie.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${movie.posterPath}`}
            alt={movie.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.06em', textAlign: 'center', padding: '8px' }}>
            NO<br />POSTER
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {movie.title}
          </h2>
          <span style={{ fontSize: '20px', fontWeight: 100, color: 'var(--accent)', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
            {movie.rating.toFixed(1)}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '14px' }}>
          <span>{movie.year}</span>
          {movie.director && <span>{movie.director}</span>}
          {movie.runtime && <span>{movie.runtime}MIN</span>}
          {movie.genres.length > 0 && <span>{movie.genres.join(' / ')}</span>}
        </div>

        {movie.synopsis && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '480px', marginTop: '4px' }}>
            {movie.synopsis.slice(0, 180)}{movie.synopsis.length > 180 ? '…' : ''}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
            You rated this {stars}
          </span>
          {movie.letterboxdUri && (
            <a
              href={movie.letterboxdUri}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '16px', fontSize: '11px', color: 'var(--accent)', letterSpacing: '0.04em', textDecoration: 'underline' }}
            >
              Letterboxd ↗
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
