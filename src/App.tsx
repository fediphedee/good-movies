import { useState, useRef } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Header } from './components/Header'
import { MovieResult } from './components/MovieResult'
import { useMovieSearch } from './hooks/useMovieSearch'
import type { Movie } from './hooks/useMovieSearch'

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
  const { search, loading, total } = useMovieSearch()
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
      <Header />

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>

        {/* Hero prompt */}
        <div style={{ padding: '64px 0 40px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '20px' }}>
            {loading ? 'Loading…' : `${total.toLocaleString()} films rated`}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: '40px' }}>
            What do you feel like<br />watching tonight?
          </h1>

          {/* Search input */}
          <div style={{ borderBottom: '1px solid var(--fg)', paddingBottom: '12px', marginBottom: '24px' }}>
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="describe your mood, a genre, a decade, a feeling…"
              className="w-full border-none! shadow-none! ring-0! bg-transparent! text-base tracking-wide"
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '24px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px' }}>
              Try asking
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

      <footer style={{ borderTop: '1px solid var(--divider)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', marginTop: '64px' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>fediphe × Letterboxd</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>Jun 2026</span>
      </footer>
    </>
  )
}
