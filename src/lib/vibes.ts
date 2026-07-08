// Manually curated vibe lists. Like mumblecore, "calm"/"relaxed" and
// "chaos"/"wild"/"shocking" searches hard-filter to these titles instead of
// relying on the auto mood tags.
import { makeCuratedMatcher } from './curated'

const CALM_TITLES: [string, number][] = [
  ['Spirited Away', 2001],
  ['From Up on Poppy Hill', 2011],
  ['High Life', 2018],
  ['La Grazia', 2025],
  ['Train Dreams', 2025],
]

const CHAOS_TITLES: [string, number][] = [
  ['Dark Habits', 1983],
  ['Ema', 2019],
  ['Swallow', 2019],
  ['The Green Knight', 2021],
  ['Babylon', 2022],
  ['The Beast', 2023],
  ['The Sweet East', 2023],
  ['Kinds of Kindness', 2024],
  ['Caught Stealing', 2025],
  ['Eddington', 2025],
  ['Sirât', 2025],
]

export const isCalm = makeCuratedMatcher(CALM_TITLES)
export const isChaos = makeCuratedMatcher(CHAOS_TITLES)
