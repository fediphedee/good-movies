import { Fragment, useEffect, useRef } from 'react'
import { asset } from '../lib/asset'

interface WordConfig {
  word: string
  imageLight?: string
  imageDark?: string
  /** horizontal anchor: where the image's left edge sits, as % across the word */
  left?: string
  /** vertical nudge from the word's centre, in em */
  dy?: string
  /** extra horizontal nudge from the shared +100px start, e.g. '-50px' */
  dx?: string
  /** image width, in em (scales with the fluid font size) */
  w?: string
  /** art-directed line break after this word */
  breakAfter?: 'always' | 'mobile'
  /** literal number of spaces to force after this word */
  gapAfter?: number
}

// The title reads "…watching today?" in daylight and "…watching tonight?"
// after sunset (the theme flips with it); image-bearing words carry a film
// still that sits *behind* the letters, woven into the line like a collage.
// Positions are expressed relative to each word so the whole thing reflows
// fluidly. Line breaks are art-directed to match the mockup (greedy wrapping
// can't reproduce it — "What do you feel" and "feel like watching" are
// near-identical widths):
//   desktop → "What do you" / "feel like watching" / "tonight?"
//   mobile  → "What do you" / "feel like" / "watching" / "tonight?"
const WORDS: WordConfig[] = [
  { word: 'What',     imageLight: '/movies-stills/what_light.png',      imageDark: '/movies-stills/what_dark.png',     left: '52%', dy: '-0.18em', w: '1.95em', gapAfter: 8 },
  { word: 'do' },
  { word: 'you', breakAfter: 'always' },
  { word: 'feel',     imageLight: '/movies-stills/feel_light.png',      imageDark: '/movies-stills/feel_dark.png',     left: '58%', dy: '0.10em',  w: '1.95em', dx: '-50px', gapAfter: 8 },
  { word: 'like', breakAfter: 'mobile' },
  { word: 'watching', imageLight: '/movies-stills/whatching_light.png', imageDark: '/movies-stills/watching_dark.png', left: '46%', dy: '-0.32em', w: '1.95em', breakAfter: 'always' },
  { word: 'tonight?', imageLight: '/movies-stills/tonight_light.png',   imageDark: '/movies-stills/tonight_dark.png',   left: '44%', dy: '0.36em',  w: '1.95em' },
]

// Grouped cursor repulsion: the whole collage drifts away from the pointer as
// one rigid unit. The target offset is a smooth tanh of the cursor's distance
// from the title centre — continuous everywhere, so there's no direction-flip
// "snap" when the cursor passes over an image. It just eases in and out.
const MAX_OFFSET = 40 // px — how far the group can drift
const SCALE = 320     // px — how quickly the drift saturates toward MAX_OFFSET
const EASE = 0.08     // lerp factor toward the target each frame (lower = softer)
// Per-image scroll-parallax speeds for touch devices (no cursor to react to).
// Mixed signs/magnitudes give the collage depth as the page scrolls.
const PARALLAX_FACTORS = [-0.08, 0.12, -0.14, 0.09, 0.06]

export function HeroTitle({ dark }: { dark: boolean }) {
  const imgs = useRef<(HTMLImageElement | null)[]>([])
  const h1Ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const els = imgs.current
    const h1 = h1Ref.current
    if (!h1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0

    // Touch devices (and the mobile layout width) can't rely on a cursor, so
    // swap the repulsion for a scroll parallax: each still drifts vertically at
    // its own rate as the page moves.
    if (window.matchMedia('(hover: none)').matches || window.matchMedia('(max-width: 640px)').matches) {
      const cur = els.map(() => 0)
      let scrollY = window.scrollY
      const frame = () => {
        let moving = false
        for (let i = 0; i < els.length; i++) {
          const el = els[i]
          if (!el) continue
          const target = scrollY * PARALLAX_FACTORS[i % PARALLAX_FACTORS.length]
          cur[i] += (target - cur[i]) * 0.1
          if (Math.abs(target - cur[i]) > 0.1) moving = true
          el.style.transform = `translate3d(0, ${cur[i].toFixed(2)}px, 0)`
        }
        raf = moving ? requestAnimationFrame(frame) : 0
      }
      const onScroll = () => {
        scrollY = window.scrollY
        if (!raf) raf = requestAnimationFrame(frame)
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      onScroll()
      return () => {
        window.removeEventListener('scroll', onScroll)
        if (raf) cancelAnimationFrame(raf)
      }
    }

    // Pointer devices: grouped cursor repulsion. The whole collage drifts away
    // from the pointer as one unit; tanh keeps it smooth (no direction-flip
    // "snap" when the cursor crosses an image) and capped at ±MAX_OFFSET.
    let mx = -99999
    let my = -99999
    let curX = 0
    let curY = 0
    let tgtX = 0
    let tgtY = 0

    const computeTarget = () => {
      if (mx < -9999) { tgtX = 0; tgtY = 0; return }
      const r = h1.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      tgtX = -MAX_OFFSET * Math.tanh((mx - cx) / SCALE)
      tgtY = -MAX_OFFSET * Math.tanh((my - cy) / SCALE)
    }
    const frame = () => {
      curX += (tgtX - curX) * EASE
      curY += (tgtY - curY) * EASE
      const t = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`
      for (const el of els) if (el) el.style.transform = t
      raf = (Math.abs(tgtX - curX) > 0.03 || Math.abs(tgtY - curY) > 0.03)
        ? requestAnimationFrame(frame)
        : 0
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; computeTarget(); kick() }
    const onLeave = () => { mx = -99999; my = -99999; computeTarget(); kick() }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  let imgIndex = 0

  return (
    <h1 ref={h1Ref} className="rgm-hero" style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 400,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
      marginTop: '40px',
      marginBottom: '80px',
      textAlign: 'center',
      isolation: 'isolate',
      position: 'relative',
      left: '50%',
      width: 'min(988px, 92vw)',
      transform: 'translateX(-50%)',
    }}>
      {WORDS.map(({ word, imageLight, imageDark, left, dy, dx, w, breakAfter, gapAfter }) => {
        const hasImage = !!imageLight
        const src = hasImage ? asset((dark ? imageDark : imageLight)!) : ''
        const idx = hasImage ? imgIndex++ : -1
        // Day/night wording; the config keeps "tonight?" as the stable key
        const label = word === 'tonight?' && !dark ? 'today?' : word

        return (
          <Fragment key={word}>
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                marginRight: gapAfter ? 0 : '0.22em',
                zIndex: 1,
              }}
            >
              {label}
              {hasImage && (
                <span
                  aria-hidden
                  className={`rgm-iw rgm-iw-${word.replace(/[^a-z]/gi, '')}`}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left,
                    width: w,
                    transform: `translate(calc(100px + ${dx ?? '0px'} + var(--m-dx, 0px)), calc(-50% + ${dy} + var(--m-dy, 0px)))`,
                    pointerEvents: 'none',
                    zIndex: -1,
                  }}
                >
                  <img
                    ref={el => { imgs.current[idx] = el }}
                    src={src}
                    alt=""
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      willChange: 'transform',
                    }}
                  />
                </span>
              )}
            </span>
            {gapAfter && (
              <span aria-hidden style={{ whiteSpace: 'pre' }}>{' '.repeat(gapAfter)}</span>
            )}
            {breakAfter === 'always' && <br />}
            {breakAfter === 'mobile' && <br className="rgm-mobile-break" />}
          </Fragment>
        )
      })}
    </h1>
  )
}
