import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => setDark(d => !d)}
      style={{
        fontFamily: 'var(--font)',
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: 'none',
        border: '1px solid var(--divider)',
        color: 'var(--muted)',
        cursor: 'pointer',
        padding: '4px 10px',
        lineHeight: 1,
      }}
    >
      {dark ? 'LIGHT' : 'DARK'}
    </button>
  )
}
