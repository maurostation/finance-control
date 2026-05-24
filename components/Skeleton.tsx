'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: 'var(--bg-1)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.55) 50%, transparent 100%)',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }} />
    </div>
  );
}

// Pre-built skeleton layouts for each page
export function DashboardSkeleton() {
  return (
    <div style={{ padding: '32px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <Skeleton height={168} borderRadius={20} style={{ marginBottom: 16 }} />
      {/* Ticker */}
      <Skeleton height={44} borderRadius={0} style={{ marginBottom: 20 }} />
      {/* Week stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Skeleton height={88} borderRadius={14} />
        <Skeleton height={88} borderRadius={14} />
      </div>
      {/* Reserve */}
      <Skeleton height={116} borderRadius={14} style={{ marginBottom: 20 }} />
      {/* Cards */}
      <Skeleton height={14} borderRadius={4} width={80} style={{ marginBottom: 12 }} />
      {[1, 2].map(i => <Skeleton key={i} height={68} borderRadius={12} style={{ marginBottom: 8 }} />)}
    </div>
  );
}

export function ExtratoSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ padding: '32px 32px 16px' }}>
        <Skeleton height={12} width={60} borderRadius={4} style={{ marginBottom: 14 }} />
        <Skeleton height={40} borderRadius={10} style={{ marginBottom: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={56} borderRadius={10} />)}
        </div>
      </div>
      <div style={{ padding: '0 32px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--bd)', alignItems: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <div style={{ flex: 1 }}>
              <Skeleton height={13} width="55%" borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton height={10} width="30%" borderRadius={4} />
            </div>
            <Skeleton height={14} width={70} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsPageSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ padding: '32px 32px 20px', borderBottom: '1px solid var(--bd)' }}>
        <Skeleton height={12} width={60} borderRadius={4} style={{ marginBottom: 16 }} />
      </div>
      <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2].map(i => <Skeleton key={i} height={100} borderRadius={14} />)}
      </div>
    </div>
  );
}

export function PlanejadoSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ padding: '32px 32px 20px', borderBottom: '1px solid var(--bd)' }}>
        <Skeleton height={12} width={130} borderRadius={4} style={{ marginBottom: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Skeleton height={60} borderRadius={10} />
          <Skeleton height={60} borderRadius={10} />
        </div>
      </div>
      <div style={{ padding: '16px 32px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--bd)', alignItems: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <div style={{ flex: 1 }}>
              <Skeleton height={13} width="50%" borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton height={10} width="35%" borderRadius={4} />
            </div>
            <Skeleton height={14} width={60} borderRadius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
