import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PackageGroup = {
  id: string
  name: string
  emoji: string
  color: string
  shipmentIds: string[]
}

export type Achievement = {
  id: string
  name: string
  description: string
  emoji: string
  unlocked: boolean
  unlockedAt?: string
}

export type DeliveryPhoto = {
  id: string
  shipmentId: string
  imageUrl: string
  timestamp: string
  location?: string
}

export type DeliveryTimeStats = {
  hour: number // 0-23
  count: number
  successRate: number // 0-100
}

export type PackagesState = {
  groups: PackageGroup[]
  achievements: Achievement[]
  deliveryPhotos: DeliveryPhoto[]
  deliveryTimeStats: DeliveryTimeStats[]
  addGroup: (group: Omit<PackageGroup, 'id'>) => void
  updateGroup: (id: string, updates: Partial<PackageGroup>) => void
  deleteGroup: (id: string) => void
  addShipmentToGroup: (groupId: string, shipmentId: string) => void
  removeShipmentFromGroup: (groupId: string, shipmentId: string) => void
  unlockAchievement: (achievementId: string) => void
  addDeliveryPhoto: (photo: Omit<DeliveryPhoto, 'id'>) => void
  recordDeliveryTime: (hour: number, success: boolean) => void
}

// Predefined achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-track',
    name: 'First Steps',
    description: 'Track your first package',
    emoji: '🎯',
    unlocked: false,
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Package delivered before estimated time',
    emoji: '🌅',
    unlocked: false,
  },
  {
    id: 'world-traveler',
    name: 'World Traveler',
    description: 'Track an international shipment',
    emoji: '🌍',
    unlocked: false,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Package delivered in under 24 hours',
    emoji: '⚡',
    unlocked: false,
  },
  {
    id: 'package-master',
    name: 'Package Master',
    description: 'Track 10 packages',
    emoji: '📦',
    unlocked: false,
  },
  {
    id: 'diversity',
    name: 'Carrier Diversity',
    description: 'Use 5 different carriers',
    emoji: '🎨',
    unlocked: false,
  },
  {
    id: 'organization-pro',
    name: 'Organization Pro',
    description: 'Create your first package group',
    emoji: '📋',
    unlocked: false,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Track a package after midnight',
    emoji: '🦉',
    unlocked: false,
  },
]

export const usePackagesStore = create<PackagesState>()(
  persist(
    (set) => ({
      groups: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      deliveryPhotos: [],
      deliveryTimeStats: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, successRate: 100 })),
      
      addGroup: (group) => set((state) => ({
        groups: [...state.groups, { ...group, id: `group-${Date.now()}` }],
      })),
      
      updateGroup: (id, updates) => set((state) => ({
        groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g),
      })),
      
      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter(g => g.id !== id),
      })),
      
      addShipmentToGroup: (groupId, shipmentId) => set((state) => ({
        groups: state.groups.map(g => 
          g.id === groupId 
            ? { ...g, shipmentIds: [...new Set([...g.shipmentIds, shipmentId])] }
            : g
        ),
      })),
      
      removeShipmentFromGroup: (groupId, shipmentId) => set((state) => ({
        groups: state.groups.map(g => 
          g.id === groupId 
            ? { ...g, shipmentIds: g.shipmentIds.filter(id => id !== shipmentId) }
            : g
        ),
      })),
      
      unlockAchievement: (achievementId) => set((state) => ({
        achievements: state.achievements.map(a => 
          a.id === achievementId && !a.unlocked
            ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
            : a
        ),
      })),
      
      addDeliveryPhoto: (photo) => set((state) => ({
        deliveryPhotos: [...state.deliveryPhotos, { ...photo, id: `photo-${Date.now()}` }],
      })),
      
      recordDeliveryTime: (hour, success) => set((state) => {
        const stats = [...state.deliveryTimeStats]
        const hourStat = stats.find(s => s.hour === hour)
        if (hourStat) {
          const newCount = hourStat.count + 1
          const oldSuccesses = Math.round((hourStat.successRate / 100) * hourStat.count)
          const newSuccesses = oldSuccesses + (success ? 1 : 0)
          hourStat.count = newCount
          hourStat.successRate = Math.round((newSuccesses / newCount) * 100)
        }
        return { deliveryTimeStats: stats }
      }),
    }),
    { name: 'holly-packages' }
  )
)
