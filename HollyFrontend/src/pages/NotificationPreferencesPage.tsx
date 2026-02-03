import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { NotificationFrequency, NotificationMethod, NotificationPreferences } from '../api/types'
import { useToast } from '../ui/toaster'

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { show } = useToast()

  // Form state
  const [methods, setMethods] = useState<NotificationMethod[]>([])
  const [frequency, setFrequency] = useState<NotificationFrequency>('REAL_TIME')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    loadPreferences()
  }, [])

  async function loadPreferences() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getNotificationPreferences()
      setPreferences(res.preferences)
      setMethods(res.preferences.methods)
      setFrequency(res.preferences.frequency)
      setEnabled(res.preferences.enabled)
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences')
      show('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  function toggleMethod(method: NotificationMethod) {
    if (methods.includes(method)) {
      setMethods(methods.filter(m => m !== method))
    } else {
      setMethods([...methods, method])
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await api.updateNotificationPreferences({
        methods,
        frequency,
        enabled,
      })
      setPreferences(res.preferences)
      show('Notification preferences saved successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences')
      show('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Reset notification preferences to defaults?')) return

    setSaving(true)
    setError(null)

    try {
      await api.deleteNotificationPreferences()
      // Reset to defaults
      setMethods([])
      setFrequency('REAL_TIME')
      setEnabled(true)
      setPreferences(null)
      show('Preferences reset to defaults')
    } catch (err: any) {
      setError(err.message || 'Failed to reset preferences')
      show('Failed to reset preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Notification Preferences</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Notification Preferences</h1>
      <p className="subtitle">
        Configure how and when you want to receive notifications about your shipments.
      </p>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="preferences-form">
        <section className="form-section">
          <h2>Enable Notifications</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Enable notifications for package tracking</span>
          </label>
        </section>

        <section className="form-section">
          <h2>Notification Methods</h2>
          <p className="help-text">
            Select how you'd like to receive notifications. You can choose multiple methods.
          </p>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={methods.includes('EMAIL')}
                onChange={() => toggleMethod('EMAIL')}
                disabled={!enabled}
              />
              <span>
                <strong>Email</strong>
                <small>Receive notifications via email</small>
              </span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={methods.includes('SMS')}
                onChange={() => toggleMethod('SMS')}
                disabled={!enabled}
              />
              <span>
                <strong>SMS</strong>
                <small>Receive notifications via text message</small>
              </span>
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>Notification Frequency</h2>
          <p className="help-text">
            Choose when you want to receive notifications about your packages.
          </p>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="frequency"
                value="REAL_TIME"
                checked={frequency === 'REAL_TIME'}
                onChange={(e) => setFrequency(e.target.value as NotificationFrequency)}
                disabled={!enabled}
              />
              <span>
                <strong>Real-time</strong>
                <small>Get notified immediately when package status changes</small>
              </span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="frequency"
                value="DAILY_SUMMARY"
                checked={frequency === 'DAILY_SUMMARY'}
                onChange={(e) => setFrequency(e.target.value as NotificationFrequency)}
                disabled={!enabled}
              />
              <span>
                <strong>Daily Summary</strong>
                <small>Receive a daily digest of all package updates</small>
              </span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="frequency"
                value="OUT_FOR_DELIVERY_ONLY"
                checked={frequency === 'OUT_FOR_DELIVERY_ONLY'}
                onChange={(e) => setFrequency(e.target.value as NotificationFrequency)}
                disabled={!enabled}
              />
              <span>
                <strong>Out for Delivery Only</strong>
                <small>Only notify when package is out for delivery</small>
              </span>
            </label>
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={saving}>
            Reset to Defaults
          </button>
        </div>
      </form>

      {preferences && (
        <section className="current-settings">
          <h2>Current Settings</h2>
          <dl>
            <dt>Status:</dt>
            <dd>{preferences.enabled ? 'Enabled' : 'Disabled'}</dd>

            <dt>Methods:</dt>
            <dd>{preferences.methods.length > 0 ? preferences.methods.join(', ') : 'None selected'}</dd>

            <dt>Frequency:</dt>
            <dd>{preferences.frequency.replace(/_/g, ' ').toLowerCase()}</dd>

            {preferences.updatedAt && (
              <>
                <dt>Last Updated:</dt>
                <dd>{new Date(preferences.updatedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
        </section>
      )}
import { useEffect, useState } from 'react'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import type {
  NotificationMethod,
  NotificationFrequency,
} from '../state/notificationPreferences'

const NOTIFICATION_METHODS: { value: NotificationMethod; label: string; description: string }[] = [
  { value: 'email', label: 'Email', description: 'Receive notifications via email' },
  { value: 'push', label: 'Push', description: 'Browser push notifications' },
  { value: 'webhook', label: 'Webhook', description: 'Custom webhook endpoint' },
  { value: 'sms', label: 'SMS', description: 'Text message notifications' },
]

const NOTIFICATION_FREQUENCIES: { value: NotificationFrequency; label: string }[] = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly summary' },
  { value: 'never', label: 'Never' },
]

export function NotificationPreferencesPage() {
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    createPreference,
    updatePreference,
    deletePreference,
  } = useNotificationPreferences()

  const [selectedMethod, setSelectedMethod] = useState<NotificationMethod>('email')
  const [selectedFrequency, setSelectedFrequency] = useState<NotificationFrequency>('daily')
  const [selectedEnabled, setSelectedEnabled] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setSuccessMessage(null)

    // Validate webhook URL if method is webhook
    if (selectedMethod === 'webhook') {
      if (!webhookUrl) {
        setValidationError('Webhook URL is required for webhook notifications')
        return
      }
      if (!webhookUrl.startsWith('https://')) {
        setValidationError('Webhook URL must use HTTPS for security')
        return
      }
    }

    try {
      const metadata = selectedMethod === 'webhook' ? { url: webhookUrl } : undefined

      // Check if preference already exists
      const existing = preferences.find((p) => p.method === selectedMethod)

      if (existing) {
        await updatePreference(selectedMethod, {
          frequency: selectedFrequency,
          enabled: selectedEnabled,
          metadata,
        })
        setSuccessMessage('Notification preference updated successfully')
      } else {
        await createPreference({
          method: selectedMethod,
          frequency: selectedFrequency,
          enabled: selectedEnabled,
          metadata,
        })
        setSuccessMessage('Notification preference created successfully')
      }
    } catch (err) {
      // Error is already set in the hook
    }
  }

  const handleDelete = async (method: NotificationMethod) => {
    if (!window.confirm(`Are you sure you want to delete ${method} notification preference?`)) {
      return
    }

    try {
      await deletePreference(method)
      setSuccessMessage('Notification preference deleted successfully')
    } catch (err) {
      // Error is already set in the hook
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#1F2A44', marginBottom: '10px' }}>Notification Preferences</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Manage how and when you receive notifications about your shipments.
      </p>

      {error && (
        <div
          style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {validationError && (
        <div
          style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {validationError}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            color: '#363',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          {successMessage}
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', color: '#1F2A44', marginBottom: '15px' }}>
          Add or Update Preference
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label
              htmlFor="method"
              style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1F2A44' }}
            >
              Notification Method
            </label>
            <select
              id="method"
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value as NotificationMethod)
                setValidationError(null)
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {NOTIFICATION_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label} - {method.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="frequency"
              style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1F2A44' }}
            >
              Frequency
            </label>
            <select
              id="frequency"
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value as NotificationFrequency)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            >
              {NOTIFICATION_FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {selectedMethod === 'webhook' && (
            <div>
              <label
                htmlFor="webhookUrl"
                style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#1F2A44' }}
              >
                Webhook URL
              </label>
              <input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value)
                  setValidationError(null)
                }}
                placeholder="https://example.com/webhook"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              id="enabled"
              type="checkbox"
              checked={selectedEnabled}
              onChange={(e) => setSelectedEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="enabled" style={{ fontWeight: '500', color: '#1F2A44' }}>
              Enabled
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#aaa' : '#4BA3FF',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}
          >
            {loading ? 'Saving...' : 'Save Preference'}
          </button>
        </form>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', color: '#1F2A44', marginBottom: '15px' }}>
          Current Preferences
        </h2>
        {loading && preferences.length === 0 ? (
          <p style={{ color: '#666' }}>Loading preferences...</p>
        ) : preferences.length === 0 ? (
          <p style={{ color: '#666' }}>No notification preferences configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {preferences.map((pref) => (
              <div
                key={pref.id}
                style={{
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: pref.enabled ? '#F5F8FD' : '#f9f9f9',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#1F2A44', marginBottom: '4px' }}>
                      {NOTIFICATION_METHODS.find((m) => m.value === pref.method)?.label || pref.method}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Frequency: <strong>{pref.frequency}</strong>
                    </p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      Status: <strong>{pref.enabled ? 'Enabled' : 'Disabled'}</strong>
                    </p>
                    {pref.metadata?.url && (
                      <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                        URL: <code>{String(pref.metadata.url)}</code>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(pref.method)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#fff',
                      color: '#c33',
                      padding: '8px 16px',
                      border: '1px solid #c33',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
