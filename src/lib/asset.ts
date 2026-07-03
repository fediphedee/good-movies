// Resolve a public asset path against Vite's configured base, so URLs work
// both at the domain root (dev) and under a subpath (GitHub Pages).
export const asset = (path: string) =>
  import.meta.env.BASE_URL + path.replace(/^\//, '')
