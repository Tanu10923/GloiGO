
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api'

export default function Vans({ token }) {
  const [vans, setVans] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [vanNumber, setVanNumber] = useState('')
  const [driverId, setDriverId] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [vanData, driverData] = await Promise.all([
        apiRequest('/admin/vans', { token }),
        apiRequest('/admin/drivers/approved', { token }),
      ])

      setVans(vanData.vans || [])
      setDrivers(driverData.drivers || [])
    } catch (err) {
      setError(err.message || 'Unable to load van management data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addVan = async (e) => {
    e.preventDefault()

    if (vanNumber.trim().length < 2) {
      setError('Enter a valid van number.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const body = {
        van_number: vanNumber.trim(),
        ...(driverId ? { driver_id: driverId } : {}),
      }

      const data = await apiRequest('/admin/vans', {
        token,
        method: 'POST',
        body,
      })

      setMessage(data.message || 'Van added successfully')
      setVanNumber('')
      setDriverId('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to add van')
    } finally {
      setSaving(false)
    }
  }

  const updateVan = async (vanId, changes) => {
    setBusyId(vanId)
    setError('')
    setMessage('')

    try {
      const data = await apiRequest(`/admin/vans/${vanId}`, {
        token,
        method: 'PATCH',
        body: changes,
      })

      setMessage(data.message || 'Van updated successfully')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to update van')
    } finally {
      setBusyId(null)
    }
  }

  const statusColor = (status) => ({
    available: '#34d399',
    maintenance: '#fbbf24',
    inactive: '#f87171',
  }[status] || '#ffffff')

  return (
    <section className="vans-page">
      <div className="vans-heading">
        <div>
          <span className="tagline">GLOIGO / FLEET MANAGEMENT</span>
          <h2>Van Management</h2>
          <p>Add vans, assign approved drivers and manage van status.</p>
        </div>

        <button onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      {message && <p className="drivers-success">{message}</p>}
      {error && <p className="drivers-error">{error}</p>}

      <form className="van-add-form" onSubmit={addVan}>
        <h3>Add New Van</h3>

        <label>Van Number</label>
        <input
          value={vanNumber}
          onChange={(e) => setVanNumber(e.target.value)}
          placeholder="Example: UP16 AB 1234"
          maxLength={50}
          required
        />

        <label>Assign Approved Driver (Optional)</label>
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
        >
          <option value="">No driver assigned</option>
          {drivers.map((driver) => (
            <option key={driver.user_id} value={driver.user_id}>
              {driver.profile?.full_name || 'Driver'} — {driver.profile?.phone || driver.user_id}
            </option>
          ))}
        </select>

        <button type="submit" disabled={saving}>
          {saving ? 'Adding...' : '+ Add Van'}
        </button>
      </form>

      <div className="vans-total">
        <span>Total registered vans</span>
        <strong>{vans.length}</strong>
      </div>

      {loading ? (
        <p>Loading vans...</p>
      ) : vans.length === 0 ? (
        <div className="drivers-empty">
          <h3>No vans registered</h3>
          <p>Add your first van using the form above.</p>
        </div>
      ) : (
        <div className="vans-list">
          {vans.map((van) => (
            <article className="van-card" key={van.id}>
              <div className="van-card-heading">
                <div>
                  <span>VAN NUMBER</span>
                  <h3>{van.van_number}</h3>
                </div>

                <strong style={{ color: statusColor(van.status) }}>
                  {(van.status || 'unknown').toUpperCase()}
                </strong>
              </div>

              <div className="van-details">
                <div>
                  <span>Assigned Driver</span>
                  <strong>
                    {drivers.find((d) => d.user_id === van.driver_id)?.profile?.full_name
                      || (van.driver_id ? 'Assigned driver' : 'Not assigned')}
                  </strong>
                </div>

                <div>
                  <span>Driver ID</span>
                  <strong>{van.driver_id || 'Not assigned'}</strong>
                </div>
              </div>

              <div className="van-controls">
                <label>Assign Driver</label>
                <select
                  value={van.driver_id || ''}
                  disabled={busyId === van.id}
                  onChange={(e) =>
                    updateVan(van.id, {
                      driver_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">No driver assigned</option>
                  {drivers.map((driver) => (
                    <option key={driver.user_id} value={driver.user_id}>
                      {driver.profile?.full_name || 'Driver'} — {driver.profile?.phone || driver.user_id}
                    </option>
                  ))}
                </select>

                <label>Van Status</label>
                <select
                  value={van.status || 'inactive'}
                  disabled={busyId === van.id}
                  onChange={(e) =>
                    updateVan(van.id, { status: e.target.value })
                  }
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>

                {busyId === van.id && <span>Updating...</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
