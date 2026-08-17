import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply the saved theme before React mounts to avoid a flash of the other mode.
try {
  const savedSettings = JSON.parse(localStorage.getItem('reel.settings.v1') || '{}')
  document.documentElement.dataset.theme = savedSettings.theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.accent = savedSettings.accentScheme === 'candy' ? 'candy' : 'reel'
} catch {
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.dataset.accent = 'reel'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
