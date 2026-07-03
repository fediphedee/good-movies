import { useState, useRef, useEffect } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Header } from './components/Header'
import { HeroTitle } from './components/HeroTitle'
import { MovieResult } from './components/MovieResult'
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

  function handleSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setResults(search(trimmed))
    setHasSearched(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch(e.currentTarget.value)
  }

  function usePrompt(p: string) {
    setQuery(p)
    setResults(search(p))
    setHasSearched(true)
    inputRef.current?.focus()
  }

  return (
    <>
      <Header onHome={() => { setQuery(''); setResults([]); setHasSearched(false) }} />

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>

        {/* Hero prompt */}
        <div style={{ padding: '64px 0 40px' }}>
          <HeroTitle dark={dark} />

          {/* Search input */}
          <div style={{ marginBottom: '24px' }}>
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="describe your mood, a genre, a decade, a feeling…"
              className="w-full shadow-none! ring-0! bg-transparent! text-base tracking-wide rounded-none! border-[1px]! border-solid! border-(--divider)! focus:border-(--fg)! focus:placeholder:text-transparent! px-(--space-8)! py-(--space-8)!"
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Button
              variant="primary"
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="text-xs tracking-widest uppercase text-(--bg)! px-(--space-8)! py-(--space-4)!"
              style={{
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
              onClick={() => { setResults(random()); setQuery(''); setHasSearched(true) }}
              disabled={loading}
              className="text-xs tracking-widest uppercase px-(--space-8)! py-(--space-4)!"
            >
              Surprise me
            </Button>
            {hasSearched && (
              <Button
                variant="ghost"
                onClick={() => { setQuery(''); setResults([]); setHasSearched(false) }}
                className="text-xs tracking-widest uppercase px-(--space-8)! py-(--space-4)!"
              >
                Clear
              </Button>
            )}
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
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '8px' }}>
            {results.length === 0 ? (
              <div style={{ padding: '48px 0', color: 'var(--muted)', fontSize: '13px' }}>
                No matches — try different words.
              </div>
            ) : (
              <>
                <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '16px 0 0' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((movie, i) => (
                  <MovieResult key={movie.id} movie={movie} index={i} />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--divider)', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '64px' }}>
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
            src={asset('/Letterboxd_logo.png')}
            alt="Letterboxd"
            width={67}
            height={27}
            style={{ height: '22px', width: 'auto', display: 'block' }}
          />
        </a>
        <p style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
          Powered by my Letterboxd data.
        </p>
      </footer>
    </>
  )
}
