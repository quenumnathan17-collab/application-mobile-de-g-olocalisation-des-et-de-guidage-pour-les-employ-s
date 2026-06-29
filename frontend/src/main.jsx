import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Enregistrement automatique du Service Worker pour rendre l'app installable sur mobile
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
