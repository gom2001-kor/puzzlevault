import React from 'react'
import ReactDOM from 'react-dom/client'
import { initializeContent } from './lib/content-loader'
import './styles.css'
// Share the site's worker instead of installing another worker over learning routes.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The reading room remains usable when offline installation is unavailable.
    })
  }, { once: true })
}
// Resolve the verified edition before importing screens and their question banks.
// The static introduction remains useful while the bounded update check runs.
async function start() {
  await initializeContent()
  const { default: App } = await import('./App')
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
}
void start()
