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
          <button type="submit" className="btn btn-primary" disabled={saving || !enabled}>
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
    </div>
  )
}
