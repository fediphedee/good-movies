import { useState, useRef, useEffect } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Header } from './components/Header'
import { HeroTitle } from './components/HeroTitle'
import { MovieResult } from './components/MovieResult'
import { MovieCard } from './components/MovieCard'
import { useMovieSearch } from './hooks/useMovieSearch'
import type { Movie } from './hooks/useMovieSearch'
import { asset } from './lib/asset'

const PROMPTS = [
  'something slow and sad',
  'a 70s thriller I haven\'t seen',
  'funny but not stupid',
  'I want to feel something',
  'late night, can\'t sleep',
  'something Italian',
  'under 90 minutes',
  'best film of the 80s',
  'a hidden gem',
  'a famous classic',
]

export default function App() {
  const { search, random, loading } = useMovieSearch()
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute('data-theme') === 'dark')
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Mobile shows one movie at a time (a "deck" we walk through); desktop lists.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const [cardIndex, setCardIndex] = useState(0)
  // Desktop: reveal 5 at a time, up to a hard cap of 15 (two "load more"s)
  const [visibleCount, setVisibleCount] = useState(5)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const on = () => setIsMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // After a search runs, scroll the results into view so they're seen first
  useEffect(() => {
    if (hasSearched && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results, hasSearched])

  // Advance the mobile deck; when it runs out, reshuffle and keep going
  function nextMovie() {
    const ni = cardIndex + 1
    if (ni >= results.length) {
      setResults([...results].sort(() => Math.random() - 0.5))
      setCardIndex(0)
    } else {
      setCardIndex(ni)
    }
  }

  function handleSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setResults(search(trimmed))
    setHasSearched(true)
    setCardIndex(0)
    setVisibleCount(5)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch(e.currentTarget.value)
  }

  function usePrompt(p: string) {
    setQuery(p)
    setResults(search(p))
    setHasSearched(true)
    setCardIndex(0)
    setVisibleCount(5)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setHasSearched(false)
    setCardIndex(0)
    setVisibleCount(5)
    inputRef.current?.focus()
  }

  // "Try something else" — bring the search field back into view and focus it
  function backToSearch() {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputRef.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <Header onHome={() => { setQuery(''); setResults([]); setHasSearched(false) }} />

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>

        {/* Hero prompt */}
        <div style={{ padding: isMobile ? '24px 0 40px' : '64px 0 40px' }}>
          <HeroTitle dark={dark} />

          {/* Search input */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by mood"
              className="w-full shadow-none! ring-0! bg-transparent! text-base tracking-wide rounded-none! border-[1px]! border-solid! border-(--divider)! focus:border-(--fg)! focus:placeholder:text-transparent! pl-(--space-8)! pr-(--space-40)! py-(--space-8)!"
            />
            {(query || hasSearched) && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  lineHeight: 0,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1l11 11M12 1L1 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Submit — full-width split row on mobile, centred auto-width on desktop */}
          <div style={isMobile
            ? { display: 'flex', gap: '8px', width: '100%' }
            : { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Button
              variant="primary"
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="text-xs tracking-widest uppercase text-(--bg)! px-(--space-8)! py-(--space-4)! justify-center"
              style={{
                flex: isMobile ? 1 : undefined,
                '--kumo-button-emphasis-bg': 'var(--fg)',
                '--kumo-button-emphasis-ring': 'var(--fg)',
                '--kumo-button-emphasis-gradient-start': 'var(--fg)',
                '--kumo-button-emphasis-gradient-end': 'var(--fg)',
              } as React.CSSProperties}
            >
              Find a film
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setResults(random()); setQuery(''); setHasSearched(true); setCardIndex(0); setVisibleCount(5) }}
              disabled={loading}
              className="text-xs tracking-widest uppercase px-(--space-8)! py-(--space-4)! justify-center"
              style={{ flex: isMobile ? 1 : undefined }}
            >
              Surprise me
            </Button>
          </div>
        </div>

        {/* Suggestion prompts — shown when idle */}
        {!hasSearched && (
          <div style={{
            borderTop: '1px solid var(--divider)',
            paddingTop: '24px',
            // full-bleed: pull the top hairline out to the viewport edges,
            // then re-pad so the content stays aligned with the column
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            paddingLeft: 'calc(50vw - 50%)',
            paddingRight: 'calc(50vw - 50%)',
          }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px', textAlign: 'center' }}>
              Try asking
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {PROMPTS.map(p => (
                <Button
                  key={p}
                  variant="outline"
                  onClick={() => usePrompt(p)}
                  className="text-xs tracking-wide text-(--muted) border-(--divider) hover:text-(--fg) hover:border-(--fg) px-(--space-8)! py-(--space-4)!"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div ref={resultsRef} style={{ borderTop: '1px solid var(--divider)', paddingTop: '8px', scrollMarginTop: '16px' }}>
            {results.length === 0 ? (
              <div style={{ padding: '48px 0', color: 'var(--muted)', fontSize: '13px', textAlign: isMobile ? 'center' : 'left' }}>
                No matches — try different words.
              </div>
            ) : isMobile ? (
              <MovieCard
                movie={results[Math.min(cardIndex, results.length - 1)]}
                onNext={results.length > 1 ? nextMovie : undefined}
              />
            ) : (
              <>
                {results.slice(0, visibleCount).map((movie, i) => (
                  <MovieResult key={movie.id} movie={movie} index={i} />
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0 8px' }}>
                  {visibleCount < Math.min(15, results.length) ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(v => Math.min(v + 5, 15))}
                      style={{
                        padding: '12px 28px',
                        background: 'transparent',
                        border: '1px solid var(--divider)',
                        color: 'var(--fg)',
                        fontFamily: 'var(--font)',
                        fontSize: '12px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fg)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)' }}
                    >
                      Load more
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={backToSearch}
                      style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        fontFamily: 'var(--font)',
                        fontSize: '12px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
                    >
                      ↑ Try something else
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--divider)', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '64px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          Powered by my{' '}
          <a
            href="https://letterboxd.com/fediphe/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--fg)', textDecoration: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            Letterboxd
          </a>
          {' '}data. Movie data by{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--fg)', textDecoration: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            TMDB
          </a>
          .
        </p>
        <p style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          ©2026{' '}
          <a
            href="https://www.federicabonfanti.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--fg)', textDecoration: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            Federica Bonfanti
          </a>
          . All Rights reserved.
        </p>
        <a
          href="https://letterboxd.com/fediphe/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="fediphe on Letterboxd"
          style={{ display: 'block', lineHeight: 0 }}
        >
          <img
            src={asset(dark ? '/logo_dark.svg' : '/logo_light.svg')}
            alt="Letterboxd"
            width={90}
            height={83}
            style={{ height: '60px', width: 'auto', display: 'block' }}
          />
        </a>
      </footer>
    </>
  )
}
