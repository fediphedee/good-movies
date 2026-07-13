import { useEffect, useState } from 'react'
import { applyDaylightTheme, daylight } from '../lib/daylight'

/**
 * Drives the theme from local daylight: dark from sunset to sunrise, light
 * otherwise. Applies data-theme/data-mode on <html>, schedules a flip at the
 * next sunrise/sunset (so a tab left open crosses over live), and returns
 * whether it's currently night.
 */
export function useDaylight(): boolean {
  const [night, setNight] = useState(() => daylight().night)

  useEffect(() => {
    let timer: number
    const apply = () => {
      const d = applyDaylightTheme()
      setNight(d.night)
      // +1s past the transition so the recheck lands on the other side
      const wait = Math.max(d.nextChange.getTime() - Date.now(), 0) + 1000
      timer = window.setTimeout(apply, Math.min(wait, 2 ** 31 - 1))
    }
    apply()
    return () => clearTimeout(timer)
  }, [])

  return night
}
