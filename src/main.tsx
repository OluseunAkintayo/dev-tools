import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css';
import './tw.css';
import App from './App.tsx';
import { Toaster } from './components/ui/toaster.tsx';
import { Analytics } from "@vercel/analytics/react"


createRoot(document.getElementById('BS2GHRGSXY')!).render(
  <StrictMode>
    <App />
    <Toaster />
    <Analytics />
  </StrictMode>,
)
