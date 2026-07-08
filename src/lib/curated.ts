// Shared matcher for manually curated title lists (mumblecore, calm, chaos).
// Matched by normalized title + year (±1 for premiere/release discrepancies).

const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents so "Sirât" matches "sirat"
    .replace(/&/g, 'and')
    .replace(/['’‘"“”:.,!?()\-–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function makeCuratedMatcher(titles: [string, number][]) {
  const byTitle = new Map<string, number[]>()
  for (const [title, year] of titles) {
    const key = normalizeTitle(title)
    byTitle.set(key, [...(byTitle.get(key) ?? []), year])
  }
  return (title: string, year: number): boolean => {
    const years = byTitle.get(normalizeTitle(title))
    return years !== undefined && years.some(y => Math.abs(y - year) <= 1)
  }
}
