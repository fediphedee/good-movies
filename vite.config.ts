import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Netlify (custom domain) serves from the root; GitHub Pages from
  // https://fediphedee.github.io/good-movies/. Netlify sets NETLIFY=true
  // during its builds, so both deploys keep working.
  base: process.env.NETLIFY ? '/' : '/good-movies/',
  // Honor a harness-assigned port so multiple dev servers can coexist
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  plugins: [react(), tailwindcss()],
})
