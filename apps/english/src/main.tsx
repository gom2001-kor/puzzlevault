import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
// Share the site's worker instead of installing another worker over learning routes.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The reading room remains usable when offline installation is unavailable.
    })
  }, { once: true })
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
