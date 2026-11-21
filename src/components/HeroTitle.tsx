import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { asset } from '../lib/asset'

interface WordConfig {
  word: string
  videoLight?: string
  videoDark?: string
}

// The title reads "…watching today?" in daylight and "…watching tonight?"
// after sunset (the theme flips with it). The whole line sits dimmed (40%
// opacity); the image-bearing words are the interactive ones. Hovering one
// (mouse) or tapping it (touch) lifts that word to full colour and plays its
// film clip in a single layer that sits *behind the entire title* (every line,
// not just the hovered word) — farrynheight.com style. The title wraps
// naturally with the viewport — no forced line breaks.
const WORDS: WordConfig[] = [
  { word: 'What',     videoLight: '/videos/what-light.mp4',     videoDark: '/videos/what-dark.mp4' },
  { word: 'do' },
  { word: 'you' },
  { word: 'feel',     videoLight: '/videos/feel-light.mp4',     videoDark: '/videos/feel-dark.mp4' },
  { word: 'like' },
  { word: 'watching', videoLight: '/videos/watching-light.mp4', videoDark: '/videos/watching-dark.mp4' },
  { word: 'tonight?', videoLight: '/videos/tonight-light.mp4',  videoDark: '/videos/tonight-dark.mp4' },
]

const DIM = 0.4 // resting opacity for every word

// Pick a clip for the current theme, falling back to the other theme's clip
// when a variant is missing (the current asset set is incomplete).
function clipFor(c: WordConfig | undefined, dark: boolean): string | null {
  if (!c) return null
  const src = dark ? (c.videoDark ?? c.videoLight) : (c.videoLight ?? c.videoDark)
  return src ?? null
}

export function HeroTitle({ dark }: { dark: boolean }) {
  // The word whose clip is currently revealed (hovered on desktop, tapped on
  // mobile). Null = nothing revealed, everything dimmed.
  const [active, setActive] = useState<string | null>(null)
  // Remember how the last interaction started, so a touch-tap toggles the
  // clip while a mouse-click doesn't fight the hover state.
  const ptr = useRef<'mouse' | 'pen' | 'touch'>('mouse')
  const videoRef = useRef<HTMLVideoElement>(null)
  const clipLayerRef = useRef<HTMLSpanElement>(null)
  // Per-word element refs, so the clip layer can be centred on the active word.
  const wordRefs = useRef<Record<string, HTMLSpanElement | null>>({})

  const activeClip = clipFor(WORDS.find(w => w.word === active), dark)

  // Load + play the active clip; pause when nothing is revealed. Swapping the
  // src on activation keeps us from preloading every (large) clip at once.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (!activeClip) { v.pause(); return }
    const full = asset(activeClip)
    if (v.getAttribute('src') !== full) { v.src = full; v.load() }
    v.currentTime = 0
    const p = v.play()
    if (p) p.catch(() => {})
  }, [activeClip])

  // Centre the (behind-everything) clip layer on the active word. Re-runs on
  // resize so it stays aligned as the title reflows.
  useEffect(() => {
    const place = () => {
      const layer = clipLayerRef.current
      const el = active ? wordRefs.current[active] : null
      if (!layer || !el) return
      layer.style.left = `${el.offsetLeft + el.offsetWidth / 2}px`
      layer.style.top = `${el.offsetTop + el.offsetHeight / 2}px`
    }
    place()
    if (!active) return
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active, dark])

  return (
    <h1 className="rgm-hero" style={{
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
      color: 'var(--fg)',
    }}>
      {/* One clip layer, behind the whole title (every line sits on top of it),
          centred on whichever word is active. */}
      <span
        ref={clipLayerRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '50%',
          transform: 'translate(-50%, -50%)',
          overflow: 'hidden',
          opacity: activeClip ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </span>

      {WORDS.map(({ word, videoLight, videoDark }) => {
        const hasVideo = !!(videoLight || videoDark)
        const isActive = active === word
        // Day/night wording; the config keeps "tonight?" as the stable key
        const label = word === 'tonight?' && !dark ? 'today?' : word

        const reveal = () => setActive(word)
        const hide = () => setActive(a => (a === word ? null : a))
        const toggle = () => setActive(a => (a === word ? null : word))

        return (
            <span
              key={word}
              ref={hasVideo ? (el => { wordRefs.current[word] = el }) : undefined}
              {...(hasVideo
                ? {
                    role: 'button' as const,
                    tabIndex: 0,
                    'aria-pressed': isActive,
                    onPointerDown: (e: ReactPointerEvent) => { ptr.current = e.pointerType as typeof ptr.current },
                    onPointerEnter: (e: ReactPointerEvent) => { if (e.pointerType === 'mouse') reveal() },
                    onPointerLeave: (e: ReactPointerEvent) => { if (e.pointerType === 'mouse') hide() },
                    onClick: () => { if (ptr.current === 'touch') toggle() },
                    onFocus: reveal,
                    onBlur: hide,
                    onKeyDown: (e: ReactKeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
                    },
                  }
                : {})}
              style={{
                position: 'relative',
                display: 'inline-block',
                marginRight: '0.22em',
                opacity: isActive ? 1 : DIM,
                transition: 'opacity 0.35s ease',
                cursor: hasVideo ? 'pointer' : 'default',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                zIndex: 1,
              }}
            >
              {label}
            </span>
        )
      })}
    </h1>
  )
}
