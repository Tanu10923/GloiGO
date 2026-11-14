
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api'

export default function Bookings({ token, initialStatus = 'all' }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState(initialStatus)

  useEffect(() => {
    setFilter(initialStatus)
  }, [initialStatus])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/admin/bookings/all', { token })
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err.message || 'Unable to load bookings')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return

    setBusyId(bookingId)
    setError('')
    setMessage('')

    try {
      const data = await apiRequest(
        `/admin/bookings/${bookingId}/cancel`,
        { token, method: 'PATCH' }
      )
      setMessage(data.message || 'Booking cancelled successfully')
      await loadBookings()
    } catch (err) {
      setError(err.message || 'Unable to cancel booking')
    } finally {
      setBusyId(null)
    }
  }

  const statusColor = (status) => {
    const colors = {
      pending: '#fbbf24',
      accepted: '#60a5fa',
      arriving: '#a78bfa',
      in_progress: '#22d3ee',
      completed: '#34d399',
      cancelled: '#f87171',
    }
    return colors[status] || '#ffffff'
  }

  return (
    <section className="bookings-page">
      <div className="bookings-heading">
        <div>
          <span className="tagline">GLOIGO / BOOKING MANAGEMENT</span>
          <h2>All Bookings</h2>
          <p>Monitor and manage customer bookings.</p>
        </div>

        <button onClick={loadBookings} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      <div className="bookings-total">
        <span>Total bookings</span>
        <strong>{bookings.length}</strong>
      </div>
      <div className="booking-filters">
        {['all', 'pending', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {message && <p className="drivers-success">{message}</p>}
      {error && <p className="drivers-error">{error}</p>}

      {loading ? (
        <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div className="drivers-empty">
          <h3>No bookings found</h3>
          <p>Customer bookings will appear here.</p>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings
            .filter(booking => filter === 'all' || booking.status === filter)
            .map((booking) => ( 
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-heading">
                <div>
                  <span>BOOKING ID</span>
                  <strong>{booking.id}</strong>
                </div>

                <span
                  className="booking-status"
                  style={{ color: statusColor(booking.status) }}
                >
                  {(booking.status || 'unknown').replaceAll('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="booking-info-grid">
                <div>
                  <span>Pickup address</span>
                  <strong>{booking.pickup_address || 'Not available'}</strong>
                </div>

                <div>
                  <span>Mobile number</span>
                  <strong>{booking.mobile_number || 'Not available'}</strong>
                </div>

                <div>
                  <span>Fare</span>
                  <strong>
                    {booking.fare_amount != null
                      ? `₹${booking.fare_amount}`
                      : 'Not calculated'}
                  </strong>
                </div>

                <div>
                  <span>Payment status</span>
                  <strong>{booking.payment_status || 'Not available'}</strong>
                </div>

                <div>
                  <span>Created</span>
                  <strong>
                    {booking.created_at
                      ? new Date(booking.created_at).toLocaleString()
                      : 'Not available'}
                  </strong>
                </div>
              </div>

              {!['completed', 'cancelled'].includes(booking.status) && (
                <button
                  className="booking-cancel-button"
                  disabled={busyId === booking.id}
                  onClick={() => cancelBooking(booking.id)}
                >
                  {busyId === booking.id ? 'Please wait...' : 'Cancel booking'}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
