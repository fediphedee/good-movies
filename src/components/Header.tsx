import { ThemeToggle } from './ThemeToggle'
import { asset } from '../lib/asset'

interface HeaderProps {
  onHome?: () => void
}

export function Header({ onHome }: HeaderProps) {
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
        <a
          href={import.meta.env.BASE_URL}
          aria-label="Really Good Movies — home"
          onClick={e => {
            if (onHome) {
              e.preventDefault()
              onHome()
            }
          }}
          style={{ display: 'block', lineHeight: 0 }}
        >
          <img
            src={asset('/muybridge_race.gif')}
            alt="Really Good Movies"
            style={{ height: '60px', display: 'block' }}
          />
        </a>
        <p
          className="max-sm:hidden"
          style={{
            fontFamily: 'var(--font)',
            fontSize: '11px',
            fontWeight: 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
            textAlign: 'center',
            color: 'var(--fg)',
            flex: 1,
          }}
        >
          Really Good<br />Movies
        </p>
        <ThemeToggle />
      </div>
      <hr />
    </header>
  )
}
