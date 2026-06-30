export interface Movie {
  id: number
  title: string
  year: number
  director: string
  genres: string[]
  runtime: number
  score: number
  reason: string
}

interface MovieCardProps {
  movie: Movie
  index: number
}

export function MovieCard({ movie, index }: MovieCardProps) {
  const num = String(index + 1).padStart(2, '0')

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        gap: '0 20px',
        alignItems: 'start',
        padding: '20px 24px',
        borderBottom: '1px solid var(--divider)',
        cursor: 'default',
      }}
    >
      {/* Index */}
      <span style={{ fontSize: '11px', color: 'var(--muted)', paddingTop: '2px', letterSpacing: '0.06em' }}>
        {num}
      </span>

      {/* Main info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            {movie.title}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {movie.year}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '16px', letterSpacing: '0.04em' }}>
          <span>{movie.director}</span>
          <span>{movie.runtime}MIN</span>
          <span>{movie.genres.join(' / ')}</span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', maxWidth: '520px', lineHeight: 1.6 }}>
          {movie.reason}
        </p>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '22px', fontWeight: 100, letterSpacing: '-0.03em', color: 'var(--accent)' }}>
          {movie.score.toFixed(1)}
        </span>
      </div>
    </article>
  )
}
