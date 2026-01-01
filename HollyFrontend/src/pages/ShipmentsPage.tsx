import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { CarrierCandidate, ShipmentSummary } from '../api/types'
import { useSessionStore } from '../state/session'
import { useToast } from '../ui/toaster'
import { z } from 'zod'
import { SkeletonCard } from '../ui/Skeleton'
import { usePackagesStore } from '../state/packages'
import { celebrate } from '../ui/celebration'

export default function ShipmentsPage() {
  const [items, setItems] = useState<ShipmentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(20)
  const { userId } = useSessionStore()
  const { show } = useToast()
  
  // Package grouping and achievements
  const { 
    groups, 
    achievements, 
    deliveryPhotos,
    deliveryTimeStats,
    deliveryStreak,
    packageRaces,
    addGroup, 
    addShipmentToGroup, 
    removeShipmentFromGroup, 
    unlockAchievement,
    addDeliveryPhoto,
    recordDeliveryTime,
    recordDelivery,
    startRace,
    finishRace
  } = usePackagesStore()
  const [showGroups, setShowGroups] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showPhotoGallery, setShowPhotoGallery] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showStreaks, setShowStreaks] = useState(false)
  const [showRaces, setShowRaces] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupEmoji, setNewGroupEmoji] = useState('📦')

  const [tn, setTn] = useState('')
  const [label, setLabel] = useState('')
  const [dest, setDest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [carrierCandidates, setCarrierCandidates] = useState<CarrierCandidate[] | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string>('AUTO')
  const [bulkTn, setBulkTn] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  
  function exportCsv() {
    const rows = (items ?? []).map(s => ({
      label: s.label ?? '',
      trackingNumber: s.trackingNumber,
      carrier: s.carrier ?? '',
      status: s.status,
      eta: s.eta ?? '',
      origin: s.origin ?? '',
      destination: s.destination ?? '',
      createdAt: s.createdAt,
    }))
    const header = ['label','trackingNumber','carrier','status','eta','origin','destination','createdAt']
    const csv = [header.join(','), ...rows.map(r => header.map(k => {
      const v = (r as any)[k] ?? ''
      const needsQuote = /[",\n]/.test(String(v))
      const safe = String(v).replace(/"/g, '""')
      return needsQuote ? `"${safe}"` : safe
    }).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipments-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const res = await api.listShipments({ limit, userId: userId ?? undefined })
        if (!cancelled) {
          setItems(res.items)
          
          // Check for achievements
          checkAchievements(res.items)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load shipments')
        show('Failed to load shipments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [userId, limit])
  
  // Achievement checking logic
  function checkAchievements(shipments: ShipmentSummary[]) {
    const currentAchievements = achievements
    
    // Start races for newly tracked packages (not delivered yet)
    shipments.forEach(s => {
      const existingRace = packageRaces.find(r => r.shipmentId === s.id)
      if (!existingRace && s.status !== 'DELIVERED') {
        startRace(s.id, s.trackingNumber, s.carrier || 'Unknown', s.label || s.trackingNumber)
      }
      
      // Finish race and record delivery for delivered packages
      if (s.status === 'DELIVERED' && existingRace && !existingRace.endTime) {
        finishRace(s.id)
        // Record delivery for streak tracking (use today's date)
        const today = new Date().toISOString().split('T')[0]
        recordDelivery(today)
      }
    })
    
    // First Steps - track first package
    if (shipments.length >= 1 && !currentAchievements.find(a => a.id === 'first-track')?.unlocked) {
      unlockAchievement('first-track')
      show('🎯 Achievement Unlocked: First Steps!')
      celebrate({ style: 'confetti', duration: 2000, sound: false, respectReducedMotion: true })
    }
    
    // Package Master - track 10 packages
    if (shipments.length >= 10 && !currentAchievements.find(a => a.id === 'package-master')?.unlocked) {
      unlockAchievement('package-master')
      show('📦 Achievement Unlocked: Package Master!')
      celebrate({ style: 'stars', duration: 3000, sound: false, respectReducedMotion: true })
    }
    
    // World Traveler - international shipment
    const hasInternational = shipments.some(s => 
      s.carrier?.toLowerCase().includes('international') ||
      s.carrier?.toLowerCase().includes('dhl') ||
      s.carrier?.toLowerCase().includes('ups worldwide')
    )
    if (hasInternational && !currentAchievements.find(a => a.id === 'world-traveler')?.unlocked) {
      unlockAchievement('world-traveler')
      show('🌍 Achievement Unlocked: World Traveler!')
    }
    
    // Carrier Diversity - 5 different carriers
    const uniqueCarriers = new Set(shipments.map(s => s.carrier).filter(Boolean))
    if (uniqueCarriers.size >= 5 && !currentAchievements.find(a => a.id === 'diversity')?.unlocked) {
      unlockAchievement('diversity')
      show('🎨 Achievement Unlocked: Carrier Diversity!')
    }
    
    // Night Owl - tracking after midnight
    const now = new Date()
    if (now.getHours() >= 0 && now.getHours() < 6 && !currentAchievements.find(a => a.id === 'night-owl')?.unlocked) {
      unlockAchievement('night-owl')
      show('🦉 Achievement Unlocked: Night Owl!')
    }
  }

  const schema = z.object({
    trackingNumber: z.string().min(3, 'Tracking number too short'),
    label: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
    destination: z.string().max(120).optional().or(z.literal('').transform(() => undefined)),
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const tnTrim = tn.trim()
      if (tnTrim.length < 3) { setCarrierCandidates(null); return }
      setDetecting(true)
      try {
        const resp = await api.probeCarrier(tnTrim)
        if (!cancelled) {
          setCarrierCandidates(resp.candidates)
          const top = resp.candidates[0]
          if (top?.validated) setSelectedCarrier(top.name)
          else setSelectedCarrier('AUTO')
        }
      } catch {
        if (!cancelled) setCarrierCandidates(null)
      } finally {
        if (!cancelled) setDetecting(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [tn])

  async function onResolve(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const parsed = schema.parse({ trackingNumber: tn.trim(), label: label.trim(), destination: dest.trim() })
      await api.resolveShipment({
        trackingNumber: parsed.trackingNumber,
        hintCarrier: selectedCarrier ?? 'AUTO',
        label: parsed.label ?? null,
        destination: parsed.destination ?? null,
        userId: userId ?? null,
      })
      setTn(''); setLabel(''); setDest('')
      show('Shipment added')
      // Refresh list with same limit
      const res = await api.listShipments({ limit, userId: userId ?? undefined })
      setItems(res.items)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to track shipment')
      show('Failed to add shipment')
    } finally {
      setSubmitting(false)
    }
  }

  async function onBulkAdd(e: FormEvent) {
    e.preventDefault()
    const lines = bulkTn.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    setBulkSubmitting(true)
    let ok = 0, fail = 0
    for (const line of lines) {
      try {
        await api.resolveShipment({ trackingNumber: line, hintCarrier: 'AUTO', userId: userId ?? null })
        ok++
      } catch {
        fail++
      }
    }
    try {
      const res = await api.listShipments({ limit, userId: userId ?? undefined })
      setItems(res.items)
    } catch {}
    setBulkSubmitting(false)
    setBulkTn('')
    show(`Added ${ok} shipments${fail ? `, ${fail} failed` : ''}`)
  }

  return (
    <div>
      <h1>My Shipments</h1>
      
      {/* Quick Stats & Achievements Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          className="chip"
          onClick={() => setShowAchievements(!showAchievements)}
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          🏆 Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
        </button>
        
        <button 
          className="chip"
          onClick={() => setShowGroups(!showGroups)}
        >
          📋 Groups ({groups.length})
        </button>
        
        <button 
          className="chip"
          onClick={() => setShowPhotoGallery(!showPhotoGallery)}
        >
          📸 Photos ({deliveryPhotos.length})
        </button>
        
        <button 
          className="chip"
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          🗺️ Delivery Heatmap
        </button>
        
        <button 
          className="chip"
          onClick={() => setShowStreaks(!showStreaks)}
          style={{ background: deliveryStreak.current >= 3 ? '#4BA3FF' : undefined, color: deliveryStreak.current >= 3 ? 'white' : undefined }}
        >
          🔥 Streak: {deliveryStreak.current} {deliveryStreak.current >= 3 ? 'days' : 'day'}
        </button>
        
        <button 
          className="chip"
          onClick={() => setShowRaces(!showRaces)}
        >
          🏁 Races ({packageRaces.filter(r => r.endTime).length})
        </button>
        
        {items && items.length > 0 && (
          <>
            <span className="chip" style={{ cursor: 'default' }}>
              📦 {items.length} Total
            </span>
            <span className="chip" style={{ cursor: 'default' }}>
              ✅ {items.filter(s => s.status === 'DELIVERED').length} Delivered
            </span>
            <span className="chip" style={{ cursor: 'default' }}>
              🚚 {items.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length} Active
            </span>
          </>
        )}
      </div>
      
      {/* Achievements Panel */}
      {showAchievements && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>🏆 Your Achievements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {achievements.map(achievement => (
              <div 
                key={achievement.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: achievement.unlocked ? 'var(--primary)' : 'var(--bg)',
                  color: achievement.unlocked ? 'white' : 'inherit',
                  opacity: achievement.unlocked ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{achievement.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{achievement.name}</div>
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
                  {achievement.description}
                </div>
                {achievement.unlocked && achievement.unlockedAt && (
                  <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
                    ✓ {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Groups Panel */}
      {showGroups && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>📋 Package Groups</h3>
          
          {/* Create Group Form */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Group name (e.g., Christmas Gifts)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
            <select
              value={newGroupEmoji}
              onChange={(e) => setNewGroupEmoji(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            >
              <option value="📦">📦 Package</option>
              <option value="🎁">🎁 Gift</option>
              <option value="💼">💼 Work</option>
              <option value="🏠">🏠 Home</option>
              <option value="🎄">🎄 Christmas</option>
              <option value="🎂">🎂 Birthday</option>
              <option value="📚">📚 Books</option>
              <option value="👕">👕 Clothes</option>
            </select>
            <button
              className="chip"
              onClick={() => {
                if (newGroupName.trim()) {
                  addGroup({
                    name: newGroupName.trim(),
                    emoji: newGroupEmoji,
                    color: '#4BA3FF',
                    shipmentIds: []
                  })
                  setNewGroupName('')
                  show(`📋 Created group: ${newGroupName}`)
                  
                  // Unlock achievement
                  if (!achievements.find(a => a.id === 'organization-pro')?.unlocked) {
                    unlockAchievement('organization-pro')
                    show('📋 Achievement Unlocked: Organization Pro!')
                  }
                }
              }}
              disabled={!newGroupName.trim()}
            >
              ➕ Create Group
            </button>
          </div>
          
          {/* Groups List */}
          {groups.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No groups yet. Create one to organize your packages!
            </p>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {groups.map(group => (
                <button
                  key={group.id}
                  className="chip"
                  onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  style={{
                    background: selectedGroup === group.id ? 'var(--primary)' : 'var(--bg)',
                    color: selectedGroup === group.id ? 'white' : 'inherit',
                  }}
                >
                  {group.emoji} {group.name} ({group.shipmentIds.length})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Photo Gallery Panel */}
      {showPhotoGallery && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>📸 Delivery Photo Gallery</h3>
          
          {deliveryPhotos.length === 0 ? (
            <div>
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No delivery photos yet. Photos will be automatically saved when packages are delivered with proof-of-delivery images.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                💡 Tip: Enable carrier photo delivery notifications to collect delivery photos automatically!
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {deliveryPhotos.slice(0, 12).map(photo => (
                  <div 
                    key={photo.id}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      background: 'var(--bg)',
                    }}
                  >
                    <div style={{ 
                      height: '150px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '48px'
                    }}>
                      📦
                    </div>
                    <div style={{ padding: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        {new Date(photo.timestamp).toLocaleDateString()}
                      </div>
                      {photo.location && (
                        <div style={{ color: 'var(--text-muted)' }}>
                          📍 {photo.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {deliveryPhotos.length > 12 && (
                <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Showing 12 of {deliveryPhotos.length} photos
                </p>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Delivery Heatmap Panel */}
      {showHeatmap && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>🗺️ Delivery Time Heatmap</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Best and worst times for deliveries in your area based on your package history
          </p>
          
          {deliveryTimeStats.every(s => s.count === 0) ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No delivery data yet. Data will be collected automatically as packages are delivered.
            </p>
          ) : (
            <>
              {/* Time of day sections */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Morning (6 AM - 12 PM)</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {deliveryTimeStats.slice(6, 12).map(stat => (
                    <div key={stat.hour} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ 
                        height: `${Math.max(20, stat.count * 10)}px`,
                        background: stat.count > 0 
                          ? stat.successRate > 80 ? '#4BA3FF' 
                          : stat.successRate > 50 ? '#FFA94B' 
                          : '#FF4B4B'
                          : 'var(--border)',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: '4px'
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {stat.hour}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Afternoon (12 PM - 6 PM)</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {deliveryTimeStats.slice(12, 18).map(stat => (
                    <div key={stat.hour} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ 
                        height: `${Math.max(20, stat.count * 10)}px`,
                        background: stat.count > 0 
                          ? stat.successRate > 80 ? '#4BA3FF' 
                          : stat.successRate > 50 ? '#FFA94B' 
                          : '#FF4B4B'
                          : 'var(--border)',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: '4px'
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {stat.hour}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Evening (6 PM - 12 AM)</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {deliveryTimeStats.slice(18, 24).map(stat => (
                    <div key={stat.hour} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ 
                        height: `${Math.max(20, stat.count * 10)}px`,
                        background: stat.count > 0 
                          ? stat.successRate > 80 ? '#4BA3FF' 
                          : stat.successRate > 50 ? '#FFA94B' 
                          : '#FF4B4B'
                          : 'var(--border)',
                        borderRadius: '4px 4px 0 0',
                        marginBottom: '4px'
                      }} />
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {stat.hour}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Legend */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '12px', fontSize: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#4BA3FF', borderRadius: '2px' }} />
                  <span>High success (80%+)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#FFA94B', borderRadius: '2px' }} />
                  <span>Medium (50-80%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#FF4B4B', borderRadius: '2px' }} />
                  <span>Low (&lt;50%)</span>
                </div>
              </div>
              
              {/* Best times recommendation */}
              {(() => {
                const bestHours = deliveryTimeStats
                  .filter(s => s.count > 0)
                  .sort((a, b) => b.successRate - a.successRate)
                  .slice(0, 3)
                
                if (bestHours.length > 0) {
                  return (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '12px', 
                      background: 'var(--primary)', 
                      color: 'white', 
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      💡 <strong>Best delivery times:</strong> {bestHours.map(h => `${h.hour}:00`).join(', ')} 
                      ({Math.round(bestHours[0].successRate)}% success rate)
                    </div>
                  )
                }
                return null
              })()}
            </>
          )}
        </div>
      )}
      
      {/* Delivery Streaks Panel */}
      {showStreaks && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>🔥 Delivery Streaks</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Track consecutive days with deliveries and challenge yourself!
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Current Streak Card */}
            <div style={{ 
              flex: '1 1 200px',
              padding: '1.5rem', 
              background: deliveryStreak.current >= 3 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg)',
              color: deliveryStreak.current >= 3 ? 'white' : 'inherit',
              borderRadius: '12px',
              textAlign: 'center',
              border: deliveryStreak.current >= 3 ? 'none' : '2px solid var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {deliveryStreak.current >= 7 ? '🔥🔥🔥' : deliveryStreak.current >= 3 ? '🔥🔥' : '🔥'}
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' }}>
                {deliveryStreak.current}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Day{deliveryStreak.current !== 1 ? 's' : ''} Streak
              </div>
              {deliveryStreak.lastDeliveryDate && (
                <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
                  Last delivery: {new Date(deliveryStreak.lastDeliveryDate).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {/* Longest Streak Card */}
            <div style={{ 
              flex: '1 1 200px',
              padding: '1.5rem', 
              background: 'var(--bg)',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid var(--border)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>
                {deliveryStreak.longest}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Longest Streak
              </div>
            </div>
          </div>
          
          {deliveryStreak.current === 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
              Get your first delivery to start your streak! 📦
            </p>
          )}
          
          {deliveryStreak.current >= 7 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '12px', 
              background: 'var(--primary)', 
              color: 'white', 
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              🎉 Amazing! You're on a 7-day streak! Keep it going!
            </div>
          )}
        </div>
      )}
      
      {/* Package Racing Panel */}
      {showRaces && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          border: '1px solid var(--border)', 
          borderRadius: '8px',
          background: 'var(--card)'
        }}>
          <h3 style={{ marginTop: 0 }}>🏁 Package Racing</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Compare delivery speeds and see which carriers are fastest for you!
          </p>
          
          {packageRaces.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No races yet. Packages are automatically entered into races when you track them!
            </p>
          ) : (
            <>
              {/* Finished Races Leaderboard */}
              {packageRaces.filter(r => r.endTime && r.rank).length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem' }}>🏆 Fastest Deliveries</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {packageRaces
                      .filter(r => r.endTime && r.rank)
                      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                      .slice(0, 10)
                      .map(race => (
                        <div 
                          key={race.id}
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: race.rank === 1 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'var(--bg)',
                            color: race.rank === 1 ? '#000' : 'inherit',
                            borderRadius: '8px',
                            border: race.rank === 1 ? 'none' : '1px solid var(--border)'
                          }}
                        >
                          <div style={{ fontSize: '24px', fontWeight: 'bold', minWidth: '40px' }}>
                            {race.rank === 1 ? '🥇' : race.rank === 2 ? '🥈' : race.rank === 3 ? '🥉' : `#${race.rank}`}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                              {race.label || race.trackingNumber}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                              {race.carrier} • {race.duration?.toFixed(1)} hours
                            </div>
                          </div>
                          <div style={{ fontSize: '20px' }}>⚡</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Active Races */}
              {packageRaces.filter(r => !r.endTime).length > 0 && (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '1rem' }}>🚚 Currently Racing</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {packageRaces
                      .filter(r => !r.endTime)
                      .map(race => {
                        const elapsedHours = (Date.now() - new Date(race.startTime).getTime()) / (1000 * 60 * 60)
                        return (
                          <div 
                            key={race.id}
                            style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              background: 'var(--bg)',
                              borderRadius: '8px',
                              border: '1px solid var(--border)'
                            }}
                          >
                            <div style={{ fontSize: '24px' }}>🏃</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                {race.label || race.trackingNumber}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {race.carrier} • {elapsedHours.toFixed(1)} hours elapsed
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              padding: '4px 8px', 
                              background: 'var(--primary)', 
                              color: 'white', 
                              borderRadius: '4px'
                            }}>
                              In Progress
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
              
              {/* Stats */}
              {packageRaces.filter(r => r.endTime).length > 0 && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '12px', 
                  background: 'var(--bg)', 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <strong>Racing Stats:</strong> {packageRaces.filter(r => r.endTime).length} completed races
                  {packageRaces.filter(r => r.endTime).length > 0 && (
                    <span> • Average: {
                      (packageRaces
                        .filter(r => r.duration !== null)
                        .reduce((sum, r) => sum + (r.duration ?? 0), 0) / 
                       packageRaces.filter(r => r.duration !== null).length
                      ).toFixed(1)
                    } hours</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      <form className="login-form" onSubmit={onResolve} aria-label="Track a package">
        <label>
          Tracking number
          <input value={tn} onChange={(e) => setTn(e.target.value)} placeholder="1Z999..." required />
        </label>
        {carrierCandidates && carrierCandidates.length > 0 && (
          <div className="notice" aria-live="polite">
            Possible carriers:
            <select className="chip" aria-label="Detected carrier" value={selectedCarrier} onChange={(e) => setSelectedCarrier(e.target.value)}>
              <option value="AUTO">AUTO</option>
              {carrierCandidates.slice(0,5).map(c => (
                <option key={c.code} value={c.name}>{c.name} {c.validated ? '✓' : ''} {c.probability ? `(${Math.round(c.probability*100)}%)` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <label>
          Label (optional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work laptop" />
        </label>
        <label>
          Destination (optional)
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="San Francisco, CA" />
        </label>
        <button type="submit" disabled={submitting || !tn}>Track</button>
      </form>
      <details style={{ marginTop: 12 }}>
        <summary>Bulk add shipments</summary>
        <form className="login-form" onSubmit={onBulkAdd} aria-label="Bulk add shipments">
          <label>
            Paste tracking numbers (one per line)
            <textarea value={bulkTn} onChange={(e) => setBulkTn(e.target.value)} rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit' }} />
          </label>
          <button type="submit" disabled={bulkSubmitting || !bulkTn.trim()}>Add</button>
        </form>
      </details>
      {loading && <SkeletonCard />}
      {error && <div className="error" role="alert">{error}</div>}
      <ul className="features">
        {(items ?? []).map(s => (
          <li key={s.id}>
            <div><Link to={`/shipments/${s.id}`}><strong>{s.label ?? s.trackingNumber}</strong></Link></div>
            <div>Status: {s.status} {s.eta ? `· ETA ${new Date(s.eta).toLocaleString()}` : ''}</div>
            <div>{s.origin ?? 'Unknown'} → {s.destination ?? 'Unknown'}</div>
          </li>
        ))}
      </ul>
      {!loading && items?.length === 0 && <div>No shipments yet.</div>}
      {!loading && (items?.length ?? 0) < 100 && (
        <p><button className="chip" onClick={() => setLimit((l) => Math.min(100, l + 20))}>Load more</button></p>
      )}
      <p>
        <button className="chip" onClick={exportCsv} disabled={!items || items.length === 0}>Export CSV</button>
      </p>
    </div>
  )
}
