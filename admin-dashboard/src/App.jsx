
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminLogin, apiRequest } from './api'
import Drivers from './Drivers'
import Bookings from './Bookings'
import Vans from './Vans'
import ParticleWave from './ParticleWave'
import './App.css'

const menu = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'drivers', label: 'Driver Applications', icon: '♙' },
  { id: 'bookings', label: 'Bookings', icon: '▤' },
  { id: 'vans', label: 'Van Management', icon: '▣' },
]

function App() {
  const [token, setToken] = useState(null)
  const [active, setActive] = useState('dashboard')
  const [selectedBookingStatus, setSelectedBookingStatus] = useState('all')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [ripples, setRipples] = useState([])

  const createRipple = (e) => {
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev.slice(-7), {
      id,
      x: e.clientX,
      y: e.clientY
    }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 1000)
  }

  const login = async (e) => {
      e.preventDefault()
      setLoading(true)
      setError('')

      try {
        const result = await adminLogin(email, password)

        const dashboard = await apiRequest('/admin/dashboard/stats', {
          token: result.access_token,
        })

        const profile = await apiRequest('/auth/me', {
          token: result.access_token,
        })

        setToken(result.access_token)
        setStats(dashboard.stats)
        setAdminProfile(profile)

      } catch (err) {
        setToken(null)
        setAdminProfile(null)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
  const logout = () => {
      setToken(null)
      setStats(null)
      setAdminProfile(null)
      setPassword('')
      setActive('dashboard')
    }

    const cards = [
    {
      label: 'Drivers',
      value: stats?.drivers?.total ?? '—',
      icon: '✳',
      color: 'purple',
      page: 'drivers'
    },
    {
      label: 'Vans',
      value: stats?.vans?.total ?? '—',
      icon: '🚐',
      color: 'cyan',
      page: 'vans'
    },
    {
      label: 'Bookings',
      value: stats?.bookings?.total ?? '—',
      icon: '▤',
      color: 'orange',
      page: 'bookings'
    },
  ]

  return (
    <div className="creative-app" onClick={createRipple}>
      <ParticleWave />
      <motion.div
        className="floating-brand"
        animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="brand-orbit">G.</div>
        <span>GloiGO</span>
        <small>CARE IN MOTION</small>
      </motion.div>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {ripples.map(r => (
        <span
          key={r.id}
          className="water-ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}

      {!token ? (
        <motion.div
          className="creative-login"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="login-decoration decoration-one" />
          <div className="login-decoration decoration-two" />

          <form className="creative-login-card" onSubmit={login}>
            <div className="creative-logo">G.</div>
            <span className="tagline">THE GLOIGO EXPERIENCE</span>
            <h1>Welcome<br />back<span>.</span></h1>
            <p>Your platform. Your control. One workspace.</p>

            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter admin email"
              required
            />

            <label>Password</label>

            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button className="creative-login-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Enter workspace ↗'}
            </button>

            <span className="login-footer">
              Authorized administrators only
            </span>
          </form>
        </motion.div>
      ) : (
        <div className="creative-layout">
          <motion.aside
            className="creative-sidebar"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="creative-brand">
              <div className="creative-logo">G.</div>
              <div>
                <h2>GloiGO</h2>
                <span>CONTROL STUDIO</span>
              </div>
            </div>

            <div className="sidebar-label">WORKSPACE</div>

            <nav>
              {menu.map(item => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.96 }}
                  className={active === item.id ? 'creative-nav active' : 'creative-nav'}
                  onClick={() => setActive(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {active === item.id && <span className="nav-arrow">↗</span>}
                </motion.button>
              ))}
            </nav>

            

            <div className="creative-profile">
            <button
              className="profile-open"
              onClick={() => setActive('profile')}
            >
              <div className="profile-avatar">
                {(adminProfile?.full_name || email || 'A').charAt(0).toUpperCase()}
              </div>

              <div className="profile-info">
                <strong>{adminProfile?.full_name || 'Admin'}</strong>
                <span>View Profile</span>
              </div>
            </button>
          </div>
          </motion.aside>

          <main className="creative-main">
            <header className="creative-topbar">
              <div>
                <span className="tagline">GLOIGO / WORKSPACE</span>
                <h1>{menu.find(item => item.id === active)?.label}</h1>
              </div>
              <div className="live-pill">
                <span /> SYSTEM LIVE
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="page-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {active === 'dashboard' ? (
                  <>
                    <section className="hero-panel">
                      <div className="hero-copy">
                        <span className="hero-tag">✳ YOUR MANAGEMENT SPACE</span>
                        <h2>Make every<br />journey <em>better.</em></h2>
                        <p>One place to manage your customers, drivers, vans and bookings.</p>
                      </div>
                      <div className="hero-art">
                        <div className="hero-orbit orbit-one" />
                        <div className="hero-orbit orbit-two" />
                        
                        <motion.div
                        className="hero-logo-mark"
                        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          G.
                        </motion.div>
                        <div className="hero-brand-name">GloiGO</div>
                        <div className="hero-brand-caption">CARE IN MOTION</div>
                        <span className="hero-star">✳</span>
                      </div>
                      <div className="hero-index">01 / GLOIGO</div>
                    </section>

                    <div className="overview-heading">
                      <div>
                        <span className="tagline">THE BIG PICTURE</span>
                        <h2>Platform overview</h2>
                      </div>
                      <span className="overview-note">Live database statistics</span>
                    </div>

                    <div className="creative-stats">
                      {cards.map((card, index) => (
                        <motion.div
                          key={card.label}
                          className={`creative-stat ${card.color}`}
                          onClick={() => setActive(card.page)}
                          style={{ cursor: 'pointer' }}
                          initial={{ opacity: 0, y: 25 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -8, rotate: -1 }}
                        >
                          <div className="stat-top">
                            <span>{card.label}</span>
                            <span className="stat-symbol">{card.icon}</span>
                          </div>
                          <h2>{card.value}</h2>
                          <span className="stat-caption">TOTAL {card.label.toUpperCase()}</span>
                        </motion.div>
                      ))}
                    </div>

                    <section className="creative-booking-panel">
                      <div>
                        <span className="tagline">BOOKING ACTIVITY</span>
                        <h2>Booking overview</h2>
                      </div>
                      <div className="booking-metrics">
                        {Object.entries(stats?.bookings || {}).map(([key, value]) => (
                          <button
                            className="booking-metric"
                            key={key}
                            onClick={() => {
                              setSelectedBookingStatus(key === 'total' ? 'all' : key)
                              setActive('bookings')
                            }}
                            style={{ cursor: 'pointer', textAlign: 'left' }}
                          >
                            <span>{key.replaceAll('_', ' ')}</span>
                            <strong>{value}</strong>
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                  
                  ) : active === 'drivers' ? (
                    <Drivers token={token} />

                  ) : active === 'bookings' ? (
                    <Bookings token={token} initialStatus={selectedBookingStatus} />

                  ) : active === 'vans' ? (
                    <Vans token={token} />

                  ) : active === 'profile' ? (
                    <section className="profile-page">
                      <span className="tagline">ACCOUNT / PROFILE</span>
                      <h2>My Profile</h2>
                      <p>Manage your administrator account.</p>

                      <div className="profile-details">
                        <div className="profile-avatar">
                          {(adminProfile?.full_name || email || 'A').charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3>{adminProfile?.full_name || 'Admin'}</h3>
                          <p>{adminProfile?.email || email}</p>
                          <span>{adminProfile?.role || 'admin'}</span>
                        </div>
                      </div>

                      <button className="profile-logout" onClick={logout}>
                        Logout
                      </button>
                    </section>

                  ) : (
                  <section className="coming-panel">
                    <span className="coming-icon">
                      {menu.find(item => item.id === active)?.icon}
                    </span>
                    <span className="tagline">GLOIGO / MANAGEMENT</span>
                    <h2>{menu.find(item => item.id === active)?.label}</h2>
                    <p>This workspace is ready for its management features.</p>
                    <span className="coming-soon">NEXT: CONNECT ADMIN APIs</span>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  )
}

export default App
