import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '20px 24px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Really Good Movies
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.04em' }}>
            — a personal rec engine
          </span>
        </div>
        <ThemeToggle />
      </div>
      <hr />
    </header>
  )
}
