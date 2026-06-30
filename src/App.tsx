import { useState, useRef } from 'react'
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
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: var(--muted); }
        input:focus { outline: none; }
      `}</style>

      <Header />

      <main style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>

        {/* Hero prompt */}
        <div style={{ padding: '64px 0 40px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '20px' }}>
            {loading ? 'Loading…' : `${total.toLocaleString()} films rated`}
          </p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: '40px' }}>
            What do you feel like<br />watching tonight?
          </h1>

          {/* Search input */}
          <div style={{ borderBottom: '1px solid var(--fg)', paddingBottom: '12px', marginBottom: '24px' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="describe your mood, a genre, a decade, a feeling…"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font)',
                fontSize: '16px',
                color: 'var(--fg)',
                letterSpacing: '0.01em',
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              style={{
                fontFamily: 'var(--font)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'var(--fg)',
                color: 'var(--bg)',
                border: 'none',
                padding: '10px 20px',
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !query.trim() ? 0.4 : 1,
              }}
            >
              Find a film
            </button>
            {hasSearched && (
              <button
                onClick={() => { setQuery(''); setResults([]); setHasSearched(false) }}
                style={{
                  fontFamily: 'var(--font)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '10px 0',
                }}
              >
                Clear
              </button>
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
                <button
                  key={p}
                  onClick={() => usePrompt(p)}
                  style={{
                    fontFamily: 'var(--font)',
                    fontSize: '12px',
                    letterSpacing: '0.02em',
                    background: 'none',
                    border: '1px solid var(--divider)',
                    color: 'var(--muted)',
                    padding: '6px 14px',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
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
