import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  useEffect(() => {
    const mode = dark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.setAttribute('data-mode', mode)
  }, [dark])

  return (
    <button
      onClick={() => setDark(d => !d)}
      style={{
        fontFamily: 'var(--font)',
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'none',
        background: 'none',
        border: '1px solid var(--divider)',
        color: 'var(--muted)',
        cursor: 'pointer',
        padding: '4px 10px',
        lineHeight: 1,
      }}
    >
      {dark ? 'Moonlight' : 'Moonstruck'}
    </button>
  )
}
