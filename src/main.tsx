import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDaylightTheme } from './lib/daylight.ts'

// Set the day/night theme before the first render so night visitors never
// see a light flash. The useDaylight hook keeps it live from here.
applyDaylightTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
