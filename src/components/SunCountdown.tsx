import { useEffect, useState } from 'react'
import { daylight } from '../lib/daylight'

// Countdown to the next solar event, doubling as a Linklater film title:
// "38 min. Before Sunset" by day, "… Before Sunrise" by night. Clicking it
// queues the matching double bill (wired up by the parent). Always shows the
// real sun times, even when the ?sun= preview override forces a theme.
function read() {
  const d = daylight(undefined, { ignoreForce: true })
  const mins = Math.max(1, Math.round((d.nextChange.getTime() - Date.now()) / 60000))
  return { night: d.night, mins }
}

function label({ night, mins }: { night: boolean; mins: number }) {
  const count = mins < 60 ? `${mins} min.` : `${Math.floor(mins / 60)} h ${mins % 60} min.`
  return `${count} Before ${night ? 'Sunrise' : 'Sunset'}`
}

export function SunCountdown({ onClick }: { onClick: (night: boolean) => void }) {
  const [state, setState] = useState(read)

  useEffect(() => {
    const t = setInterval(() => setState(read()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <button
      type="button"
      className="rgm-btn-link rgm-sun-chip"
      onClick={() => onClick(state.night)}
      style={{
        fontFamily: 'var(--font)',
        fontSize: '12px',
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s ease',
      }}
    >
      {label(state)}
    </button>
  )
}
