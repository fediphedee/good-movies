import { useEffect, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={dark ? '/GoodMovies_dark.svg' : '/GoodMovies_light.svg'}
            alt="Really Good Movies"
            style={{ height: '60px', display: 'block' }}
          />
        </div>
        <ThemeToggle />
      </div>
      <hr />
    </header>
  )
}
