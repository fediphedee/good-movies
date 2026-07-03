import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Served from https://fediphedee.github.io/good-movies/
  base: '/good-movies/',
  plugins: [react(), tailwindcss()],
})
