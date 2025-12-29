export function SkeletonLine({ width = '100%', height = 12 }: { width?: number | string; height?: number }) {
  return <div style={{ width, height, borderRadius: 6, background: 'linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05))' }} />
}

export function SkeletonCard() {
  return (
    <div className="features" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
          <SkeletonLine width="60%" />
          <div style={{ height: 8 }} />
          <SkeletonLine width="40%" />
        </div>
      ))}
    </div>
  )
}
