// Day/night detection with no permissions and no network: the browser's IANA
// timezone (e.g. "Europe/Rome") names a city, we look up that city's rough
// coordinates, and compute today's actual sunrise/sunset with the standard
// NOAA sunrise equation (same maths as the suncalc library). Accurate to
// ~15–30 min of true local sunset — plenty for a vibe switch.

/** Approximate [lat, lon] for common IANA timezones, keyed by canonical city. */
const TZ_COORDS: Record<string, [number, number]> = {
  // Europe
  'Europe/London': [51.5, -0.1], 'Europe/Dublin': [53.3, -6.3], 'Europe/Lisbon': [38.7, -9.1],
  'Europe/Madrid': [40.4, -3.7], 'Europe/Paris': [48.9, 2.4], 'Europe/Brussels': [50.8, 4.4],
  'Europe/Amsterdam': [52.4, 4.9], 'Europe/Berlin': [52.5, 13.4], 'Europe/Zurich': [47.4, 8.5],
  'Europe/Rome': [41.9, 12.5], 'Europe/Vienna': [48.2, 16.4], 'Europe/Prague': [50.1, 14.4],
  'Europe/Warsaw': [52.2, 21.0], 'Europe/Budapest': [47.5, 19.0], 'Europe/Copenhagen': [55.7, 12.6],
  'Europe/Oslo': [59.9, 10.8], 'Europe/Stockholm': [59.3, 18.1], 'Europe/Helsinki': [60.2, 24.9],
  'Europe/Athens': [38.0, 23.7], 'Europe/Bucharest': [44.4, 26.1], 'Europe/Sofia': [42.7, 23.3],
  'Europe/Belgrade': [44.8, 20.5], 'Europe/Zagreb': [45.8, 16.0], 'Europe/Kyiv': [50.5, 30.5],
  'Europe/Kiev': [50.5, 30.5], 'Europe/Moscow': [55.8, 37.6], 'Europe/Istanbul': [41.0, 29.0],
  // Americas
  'America/New_York': [40.7, -74.0], 'America/Toronto': [43.7, -79.4], 'America/Montreal': [45.5, -73.6],
  'America/Detroit': [42.3, -83.0], 'America/Chicago': [41.9, -87.6], 'America/Winnipeg': [49.9, -97.1],
  'America/Mexico_City': [19.4, -99.1], 'America/Denver': [39.7, -105.0], 'America/Edmonton': [53.5, -113.5],
  'America/Phoenix': [33.4, -112.1], 'America/Los_Angeles': [34.1, -118.2], 'America/Vancouver': [49.3, -123.1],
  'America/Anchorage': [61.2, -149.9], 'Pacific/Honolulu': [21.3, -157.9], 'America/Halifax': [44.6, -63.6],
  'America/Bogota': [4.7, -74.1], 'America/Lima': [-12.0, -77.0], 'America/Caracas': [10.5, -66.9],
  'America/Santiago': [-33.4, -70.7], 'America/Argentina/Buenos_Aires': [-34.6, -58.4],
  'America/Sao_Paulo': [-23.6, -46.6], 'America/Havana': [23.1, -82.4], 'America/Panama': [9.0, -79.5],
  // Asia & Middle East
  'Asia/Tokyo': [35.7, 139.7], 'Asia/Seoul': [37.6, 127.0], 'Asia/Shanghai': [31.2, 121.5],
  'Asia/Hong_Kong': [22.3, 114.2], 'Asia/Taipei': [25.0, 121.6], 'Asia/Manila': [14.6, 121.0],
  'Asia/Singapore': [1.4, 103.8], 'Asia/Kuala_Lumpur': [3.1, 101.7], 'Asia/Jakarta': [-6.2, 106.8],
  'Asia/Bangkok': [13.8, 100.5], 'Asia/Ho_Chi_Minh': [10.8, 106.7], 'Asia/Kolkata': [22.6, 88.4],
  'Asia/Calcutta': [22.6, 88.4], 'Asia/Dhaka': [23.8, 90.4], 'Asia/Karachi': [24.9, 67.0],
  'Asia/Dubai': [25.2, 55.3], 'Asia/Riyadh': [24.7, 46.7], 'Asia/Tehran': [35.7, 51.4],
  'Asia/Jerusalem': [31.8, 35.2], 'Asia/Baghdad': [33.3, 44.4], 'Asia/Tashkent': [41.3, 69.2],
  'Asia/Almaty': [43.2, 76.9],
  // Africa
  'Africa/Cairo': [30.0, 31.2], 'Africa/Lagos': [6.5, 3.4], 'Africa/Nairobi': [-1.3, 36.8],
  'Africa/Johannesburg': [-26.2, 28.0], 'Africa/Casablanca': [33.6, -7.6], 'Africa/Algiers': [36.8, 3.1],
  'Africa/Tunis': [36.8, 10.2], 'Africa/Accra': [5.6, -0.2], 'Africa/Addis_Ababa': [9.0, 38.7],
  // Oceania
  'Australia/Sydney': [-33.9, 151.2], 'Australia/Melbourne': [-37.8, 145.0], 'Australia/Brisbane': [-27.5, 153.0],
  'Australia/Adelaide': [-34.9, 138.6], 'Australia/Perth': [-32.0, 115.9], 'Pacific/Auckland': [-36.8, 174.8],
}

/** Coordinates for the user's timezone; unknown zones fall back to a
 *  temperate latitude with longitude derived from the UTC offset. */
function coords(): [number, number] {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hit = TZ_COORDS[tz]
  if (hit) return hit
  return [40, -new Date().getTimezoneOffset() / 4] // 15° of longitude per hour
}

// ── NOAA sunrise equation ────────────────────────────────────────
const RAD = Math.PI / 180
const J2000 = 2451545 // Julian date of 2000-01-01 12:00 UTC

const toJulian = (d: Date) => d.getTime() / 86400000 + 2440587.5
const fromJulian = (j: number) => new Date((j - 2440587.5) * 86400000)

type SunTimes = { sunrise: Date; sunset: Date } | 'polar-night' | 'midnight-sun'

function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = -lon * RAD
  const phi = lat * RAD
  const n = Math.round(toJulian(date) - J2000 - 0.0009 - lw / (2 * Math.PI))
  const jNoon = J2000 + 0.0009 + lw / (2 * Math.PI) + n
  const M = (357.5291 + 0.98560028 * (jNoon - J2000)) * RAD // solar mean anomaly
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD
  const L = M + C + 102.9372 * RAD + Math.PI // ecliptic longitude
  const jTransit = jNoon + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
  const dec = Math.asin(Math.sin(L) * Math.sin(23.4397 * RAD))
  // -0.833° accounts for refraction + the solar disc's radius
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))
  if (cosH > 1) return 'polar-night'
  if (cosH < -1) return 'midnight-sun'
  const H = Math.acos(cosH)
  return {
    sunrise: fromJulian(jTransit - H / (2 * Math.PI)),
    sunset: fromJulian(jTransit + H / (2 * Math.PI)),
  }
}

export interface Daylight {
  night: boolean
  /** When the current phase ends (next sunrise or sunset). */
  nextChange: Date
}

export function daylight(now: Date = new Date(), opts?: { ignoreForce?: boolean }): Daylight {
  // Hidden preview seam — there's no toggle anymore, so ?sun=day / ?sun=night
  // lets us check either look regardless of the actual hour. Callers that need
  // true sun times (e.g. the countdown chip) pass ignoreForce.
  if (!opts?.ignoreForce && typeof location !== 'undefined') {
    const force = new URLSearchParams(location.search).get('sun')
    if (force === 'day' || force === 'night') {
      return { night: force === 'night', nextChange: new Date(now.getTime() + 86400000) }
    }
  }

  const [lat, lon] = coords()

  // Collect sunrise/sunset events around now; we're in night exactly when the
  // next event ahead of us is a sunrise.
  const events: { t: number; rise: boolean }[] = []
  let polarNight = false
  for (const dayOffset of [-1, 0, 1]) {
    const st = sunTimes(new Date(now.getTime() + dayOffset * 86400000), lat, lon)
    if (st === 'polar-night') { if (dayOffset === 0) polarNight = true; continue }
    if (st === 'midnight-sun') continue
    events.push({ t: st.sunrise.getTime(), rise: true }, { t: st.sunset.getTime(), rise: false })
  }
  events.sort((a, b) => a.t - b.t)

  const next = events.find(e => e.t > now.getTime())
  if (!next) {
    // Deep polar night / midnight sun: no transition nearby, re-check in 6h
    return { night: polarNight, nextChange: new Date(now.getTime() + 6 * 3600000) }
  }
  return { night: next.rise, nextChange: new Date(next.t) }
}

/** Apply the theme for the current moment. Returns the computed daylight. */
export function applyDaylightTheme(now?: Date): Daylight {
  const d = daylight(now)
  const mode = d.night ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', mode)
  document.documentElement.setAttribute('data-mode', mode)
  return d
}
