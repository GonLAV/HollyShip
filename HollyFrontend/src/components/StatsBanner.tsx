import { useEffect, useState } from 'react'
import { api } from '../api/client'

type Stats = {
  ts?: string
  shipmentsPerMinute?: number
  shipmentsPerHour?: number
  shipmentsToday?: number
  shipmentsWeek?: number
  mau?: number
}

export default function StatsBanner() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const es = api.openStatsStream((data) => {
      if (data && typeof data === 'object') setStats(data as Stats)
    })
    return () => es.close()
  }, [])

  if (!stats) return null
  return (
    <div className="banner" role="status" aria-live="polite">
      <span>Now: {stats.shipmentsPerMinute ?? 0}/min · {stats.shipmentsPerHour ?? 0}/hr</span>
      <span>Today: {stats.shipmentsToday ?? 0}</span>
      <span>Week: {stats.shipmentsWeek ?? 0}</span>
      <span>MAU: {stats.mau ?? 0}</span>
    </div>
  )
}
