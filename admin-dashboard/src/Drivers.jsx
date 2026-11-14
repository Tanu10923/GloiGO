import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from './api'

export default function Drivers({ token }) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [reason, setReason] = useState('')

  const loadApplications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/admin/drivers/pending', { token })
      setApplications(data.applications || [])
    } catch (err) {
      setError(err.message || 'Unable to load applications')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  const reviewApplication = async (userId, action, rejectionReason = null) => {
    setBusyId(userId)
    setError('')
    setMessage('')

    try {
      const data = await apiRequest(`/admin/drivers/${userId}/review`, {
        token,
        method: 'PATCH',
        body: {
          action,
          reason: rejectionReason,
        },
      })

      setMessage(data.message || 'Application updated successfully')
      setRejectId(null)
      setReason('')
      await loadApplications()
    } catch (err) {
      setError(err.message || 'Unable to update application')
    } finally {
      setBusyId(null)
    }
  }

  const rejectApplication = (userId) => {
    if (!reason.trim()) {
      setError('Please enter a rejection reason.')
      return
    }

    reviewApplication(userId, 'reject', reason.trim())
  }

  return (
    <section className="drivers-page">
      <div className="drivers-heading">
        <div>
          <span className="tagline">GLOIGO / DRIVER MANAGEMENT</span>
          <h2>Driver Applications</h2>
          <p>Review and manage new driver registrations.</p>
        </div>

        <button
          className="drivers-refresh"
          onClick={loadApplications}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      <div className="drivers-summary">
        <div>
          <span>Pending applications</span>
          <strong>{applications.length}</strong>
        </div>
        <div>
          <span>Review status</span>
          <strong>Needs attention</strong>
        </div>
      </div>

      {message && <div className="drivers-success">{message}</div>}
      {error && <div className="drivers-error">{error}</div>}

      {loading ? (
        <div className="drivers-empty">Loading driver applications...</div>
      ) : applications.length === 0 ? (
        <div className="drivers-empty">
          <div className="drivers-empty-logo">G.</div>
          <h3>All caught up!</h3>
          <p>There are no pending driver applications right now.</p>
        </div>
      ) : (
        <div className="drivers-list">
          {applications.map((driver) => {
            const profile = driver.profile || {}

            return (
              <article className="driver-card" key={driver.user_id}>
                <div className="driver-card-top">
                  <div className="driver-avatar">
                    {(profile.full_name || 'D').charAt(0).toUpperCase()}
                  </div>

                  <div className="driver-info">
                    <h3>{profile.full_name || 'Name not available'}</h3>
                    <span>{profile.phone || 'Phone not available'}</span>
                  </div>

                  <span className="driver-status">PENDING</span>
                </div>

                <div className="driver-details">
                  <div>
                    <span>License number</span>
                    <strong>{driver.license_number || 'Not provided'}</strong>
                  </div>

                  <div>
                    <span>Application date</span>
                    <strong>
                      {driver.created_at
                        ? new Date(driver.created_at).toLocaleDateString()
                        : 'Not available'}
                    </strong>
                  </div>

                  <div>
                    <span>Verification</span>
                    <strong>{driver.verification_status}</strong>
                  </div>
                </div>

                {driver.license_document_path && (
                  <div className="driver-document-note">
                    License document uploaded. Secure document preview is not
                    configured yet.
                  </div>
                )}

                {rejectId === driver.user_id && (
                  <div className="driver-reject-box">
                    <label>Reason for rejection</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter a clear reason..."
                      maxLength={500}
                    />
                    <div className="driver-reject-actions">
                      <button
                        className="driver-cancel"
                        onClick={() => {
                          setRejectId(null)
                          setReason('')
                          setError('')
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="driver-reject"
                        disabled={busyId === driver.user_id}
                        onClick={() => rejectApplication(driver.user_id)}
                      >
                        {busyId === driver.user_id
                          ? 'Please wait...'
                          : 'Confirm rejection'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="driver-actions">
                  <button
                    className="driver-approve"
                    disabled={busyId === driver.user_id}
                    onClick={() => {
                      if (window.confirm('Approve this driver application?')) {
                        reviewApplication(driver.user_id, 'approve')
                      }
                    }}
                  >
                    {busyId === driver.user_id ? 'Please wait...' : '✓ Approve'}
                  </button>

                  <button
                    className="driver-reject"
                    disabled={busyId === driver.user_id}
                    onClick={() => {
                      setRejectId(driver.user_id)
                      setReason('')
                      setError('')
                    }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}