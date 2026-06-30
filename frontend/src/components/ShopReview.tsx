import { useState, useEffect } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

const actionBtn = (bg: string, color: string) => ({
  flex: 1,
  padding: '0.4rem 0.5rem',
  borderRadius: '6px',
  border: 'none',
  background: bg,
  color: color,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  fontWeight: 600,
  fontSize: '0.82rem',
} as React.CSSProperties)

export function ShopReview() {
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking' | 'discarded'>('pending')
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchShops = async (status: string) => {
    setLoading(true)
    setError(null)
    setShops([])
    try {
      const res = await fetch(`${API_BASE}/shops?status=${status}`)
      if (!res.ok) throw new Error('Failed to fetch shops')
      setShops(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShops(activeTab) }, [activeTab])

  const updateStatus = async (companyName: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(companyName)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      setShops(prev => prev.filter(s => s.company_name !== companyName))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const tabs = [
    { key: 'pending',   label: '🟡 New Shops',      color: '#eab308', bg: 'rgba(234,179,8,0.2)' },
    { key: 'tracking',  label: '🟢 Tracked Shops',   color: '#4ade80', bg: 'rgba(34,197,94,0.2)' },
    { key: 'discarded', label: '🔴 Discarded Shops', color: '#f87171', bg: 'rgba(239,68,68,0.2)' },
  ] as const

  return (
    <div style={{ padding: '2rem', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: '#e2e8f0' }}>
          <Store size={28} color="#6366f1" />
          Shop Review System
        </h2>
        <button
          onClick={() => fetchShops(activeTab)}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: activeTab === tab.key ? tab.bg : 'transparent',
              color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
              outline: activeTab === tab.key ? `1px solid ${tab.color}` : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #f87171', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={40} color="#6366f1" style={{ marginBottom: '1rem' }} />
          <p>Loading shops...</p>
        </div>
      ) : shops.length === 0 ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Store size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No shops found here.</p>
        </div>
      ) : (
        /* Grid: 4 columnas fijas */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {shops.map(shop => (
            <div key={shop.id} style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Nombre */}
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word' }}>{shop.company_name}</h3>

              {/* Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                <span>Store Age: <strong style={{ color: '#a5b4fc' }}>{shop.shop_years} {shop.shop_years === 1 ? 'yr' : 'yrs'}</strong></span>
                <span>Score: <strong style={{ color: '#a5b4fc' }}>{shop.composite_score || 'N/A'}</strong></span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                {activeTab !== 'pending' && (
                  <button onClick={() => updateStatus(shop.company_name, 'pending')} style={actionBtn('rgba(234,179,8,0.2)', '#eab308')}>
                    <Clock size={13} /> Pending
                  </button>
                )}
                {activeTab !== 'tracking' && (
                  <button onClick={() => updateStatus(shop.company_name, 'tracking')} style={actionBtn('rgba(34,197,94,0.2)', '#4ade80')}>
                    <CheckCircle size={13} /> Track
                  </button>
                )}
                {activeTab !== 'discarded' && (
                  <button onClick={() => updateStatus(shop.company_name, 'discarded')} style={actionBtn('rgba(239,68,68,0.2)', '#f87171')}>
                    <XCircle size={13} /> Discard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
