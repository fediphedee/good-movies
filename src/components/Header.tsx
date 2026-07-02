import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 18px',
        }}
      >
        <img
          src="/muybridge_race.gif"
          alt="Really Good Movies"
          style={{ height: '60px', display: 'block' }}
        />
        <p style={{
          fontFamily: 'var(--font)',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1.4,
          textAlign: 'center',
          color: 'var(--fg)',
          flex: 1,
        }}>
          Really Good<br />Movies
        </p>
        <ThemeToggle />
      </div>
      <hr />
    </header>
  )
}
