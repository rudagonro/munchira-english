import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './brand.css'
import App from './App.jsx'
import CookieNotice from './public/CookieNotice.jsx'

const noticeRoot = document.createElement('div')
document.body.appendChild(noticeRoot)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

createRoot(noticeRoot).render(
  <StrictMode>
    <CookieNotice />
  </StrictMode>,
)
