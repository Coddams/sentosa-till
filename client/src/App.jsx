import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Till from './pages/Till'
import Analytics from './pages/Analytics'
import Log from './pages/Log'
import './App.css'

export default function App() {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const t = setInterval(tick, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">Sentosa</span>
          <span className="logo-sub">Business Center</span>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Till</NavLink>
          <NavLink to="/log" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Log</NavLink>
          <NavLink to="/analytics" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Analytics</NavLink>
        </nav>
        <span className="clock mono">{clock}</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Till />} />
          <Route path="/log" element={<Log />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  )
}
