import { useEffect, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Movie } from '../hooks/useMovieSearch'
import { posterUrl } from '../lib/poster'

// Mobile single-movie view: one film at a time, poster-forward and centred.
// Tapping the poster flips it over to reveal the synopsis and a link out to
// Letterboxd. The "next movie" CTA sits between the credits and the poster so
// only title length (not synopsis length) can shift the touch point.
export function MovieCard({ movie, onNext }: { movie: Movie; onNext?: () => void }) {
  const src = posterUrl(movie, 'w500')
  // Flip state resets whenever the film changes (e.g. "Next movie").
  const [flipped, setFlipped] = useState(false)
  useEffect(() => { setFlipped(false) }, [movie.id])

  const poster = src ? (
    <img
      src={src}
      alt={movie.title}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  ) : (
    <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em' }}>NO POSTER</span>
  )

  // Flippable only when there's something to show on the back.
  const canFlip = !!(movie.synopsis || movie.letterboxdUri)

  return (
    <article
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
      {/* Poster → tap to flip to the synopsis side */}
      <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '2 / 3', perspective: '1400px' }}>
        <div
          role={canFlip ? 'button' : undefined}
          tabIndex={canFlip ? 0 : undefined}
          aria-pressed={canFlip ? flipped : undefined}
          aria-label={canFlip ? (flipped ? 'Show poster' : 'Show description') : undefined}
          onClick={canFlip ? () => setFlipped(f => !f) : undefined}
          onKeyDown={canFlip ? (e: ReactKeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f) }
          } : undefined}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            transition: 'transform 0.6s ease',
            transform: flipped ? 'rotateY(180deg)' : 'none',
            cursor: canFlip ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Front — poster */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'var(--divider)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {poster}
          </div>

          {/* Back — synopsis + "see what people say" */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'var(--bg)',
              border: '1px solid var(--divider)',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
              overflowY: 'auto',
            }}
          >
            {movie.synopsis && (
              <p style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.7 }}>
                {movie.synopsis}
              </p>
            )}
            {movie.letterboxdUri && (
              <a
                href={movie.letterboxdUri}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  marginTop: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                  color: 'var(--fg)',
                  borderBottom: '1px solid var(--divider)',
                  paddingBottom: '2px',
                  alignSelf: 'flex-start',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M3.5 8.5 8.5 3.5M8.5 3.5H4M8.5 3.5V8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                see what people say
              </a>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05, paddingTop: '16px' }}>
        {movie.title}
      </h2>

      <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <span>{movie.year}</span>
        {movie.director && <span>{movie.director}</span>}
      </div>

      {onNext && (
        <button
          onClick={onNext}
          className="rgm-btn-primary"
          style={{
            minHeight: '48px',
            color: 'var(--bg)',
            border: 'none',
            fontFamily: 'var(--font)',
            fontSize: '12px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Next movie
        </button>
      )}
    </article>
  )
}
