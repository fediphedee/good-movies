import { asset } from '../lib/asset'

interface HeaderProps {
  onHome?: () => void
}

export function Header({ onHome }: HeaderProps) {
  return (
    <header>
      <div
        style={{
          // 1fr | auto | 1fr keeps the wordmark centred now that nothing
          // balances the logo on the right
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '20px 24px 18px',
        }}
      >
        <a
          href={import.meta.env.BASE_URL}
          aria-label="Pretty Good Movies — home"
          onClick={e => {
            if (onHome) {
              e.preventDefault()
              onHome()
            }
          }}
          style={{ display: 'block', lineHeight: 0, justifySelf: 'start' }}
        >
          <img
            src={asset('/muybridge_race.gif')}
            alt="Pretty Good Movies"
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
          }}
        >
          Pretty Good<br />Movies
        </p>
      </div>
      <hr />
    </header>
  )
}
