import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useToast } from '../ui/toaster'

const RULES = [
  {
    id: 'out_for_delivery',
    label: 'Out for delivery',
    description: 'Alert customers and ops the moment a shipment is marked out for delivery.',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    description: 'Celebrate the arrival and trigger post-delivery surveys or loyalty boosts.',
  },
  {
    id: 'exception',
    label: 'Exception',
    description: 'Notify the logistics desk immediately when an exception occurs.',
  },
]

const schema = z.object({
  event: z.enum(['out_for_delivery', 'delivered', 'exception']),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(25).optional(),
  webhook: z.string().url().optional(),
})

type FormState = z.infer<typeof schema>

export default function SmartNotificationsStarter() {
  const { show } = useToast()
  const [form, setForm] = useState<FormState>({ event: 'out_for_delivery', email: '', phone: '', webhook: '' })
  const [channels, setChannels] = useState<string[]>(['email'])
  const [subscriptions, setSubscriptions] = useState<{ id: string; rule: string; channels: string[] }[]>([])

  const preview = useMemo(() => {
    const rule = RULES.find(r => r.id === form.event)
    const channelText = channels.length ? channels.map(ch => ch.toUpperCase()).join(', ') : 'None'
    return `Event: ${rule?.label ?? 'Shipment update'} · Channels: ${channelText}`
  }, [form.event, channels])

  function toggleChannel(option: string) {
    setChannels(prev => prev.includes(option) ? prev.filter(ch => ch !== option) : [...prev, option])
  }

  function updateForm(partial: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...partial }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = schema.safeParse(form)
    if (!result.success) {
      show(`Fix validation: ${result.error.errors.map(err => err.message).join(', ')}`)
      return
    }
    const id = `${form.event}-${Date.now()}`
    setSubscriptions(prev => [{ id, rule: form.event, channels }, ...prev])
    show(`Saved rule for ${RULES.find(r => r.id === form.event)?.label}`)
  }

  return (
    <div>
      <h1>Starter: Smart Notifications</h1>
      <p>Design rule-based alerts, pick channels, and preview payloads before wiring them into the backend.</p>

      <form className="panel" onSubmit={handleSubmit}>
        <label>
          Rule
          <select value={form.event} onChange={(e) => updateForm({ event: e.target.value as FormState['event'] })}>
            {RULES.map(rule => (
              <option key={rule.id} value={rule.id}>{rule.label}</option>
            ))}
          </select>
          <small>{RULES.find(rule => rule.id === form.event)?.description}</small>
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => updateForm({ email: e.target.value })}
            placeholder="ops@hollyship.com"
          />
        </label>

        <label>
          SMS
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => updateForm({ phone: e.target.value })}
            placeholder="+1 415 555 1234"
          />
        </label>

        <label>
          Webhook URL
          <input
            type="url"
            value={form.webhook ?? ''}
            onChange={(e) => updateForm({ webhook: e.target.value })}
            placeholder="https://hooks.hollyship.com/events"
          />
        </label>

        <div className="channel-row" role="group" aria-label="Notification channels">
          {['email', 'sms', 'webhook'].map(option => (
            <button
              key={option}
              type="button"
              className={`chip ${channels.includes(option) ? 'active' : ''}`}
              onClick={() => toggleChannel(option)}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="preview">
          <strong>Preview payload</strong>
          <p>{preview}</p>
        </div>

        <button type="submit" className="primary">Save rule</button>
      </form>

      <section>
        <h2>Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div>No subscriptions yet. Add a rule to see it here.</div>
        ) : (
          <ul className="features">
            {subscriptions.map(sub => (
              <li key={sub.id}>
                <div><strong>{RULES.find(r => r.id === sub.rule)?.label}</strong></div>
                <div>Channels: {sub.channels.join(', ') || 'None'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style>{`
        .panel { display: grid; gap: 0.75rem; padding: 1rem; border: 1px solid var(--border); border-radius: 10px; background: var(--card); margin-bottom: 1.5rem; }
        label { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; }
        input, select { padding: 0.55rem 0.65rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); }
        .channel-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .preview { padding: 0.75rem; border-radius: 8px; border: 1px dashed var(--border); background: var(--bg-muted); }
        .features li { display: grid; gap: 0.25rem; }
        button.primary { align-self: flex-start; padding: 0.6rem 1.2rem; }
      `}</style>
    </div>
  )
}
