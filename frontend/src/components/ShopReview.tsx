import { useState, useEffect } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import './DataHub1688.css'

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
      const res = await fetch(`${import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'}/shops?status=${status}`)
      if (!res.ok) {
        throw new Error('Failed to fetch shops')
      }
      const data = await res.json()
      setShops(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShops(activeTab)
  }, [activeTab])

  const updateStatus = async (companyName: string, newStatus: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'}/shops/${encodeURIComponent(companyName)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      // Remove from current list
      setShops(shops.filter(s => s.company_name !== companyName))
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Store size={28} className="text-gradient" />
          Shop Review System
        </h2>
        <button className="btn btn-outline" onClick={() => fetchShops(activeTab)} disabled={loading}>
          <RefreshCw size={18} className={loading ? "animate-pulse" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          className="btn" 
          onClick={() => setActiveTab('pending')}
          style={{ 
            background: activeTab === 'pending' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'pending' ? 'white' : 'var(--text-secondary)'
          }}
        >
          New Shops (Pending)
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('tracking')}
          style={{ 
            background: activeTab === 'tracking' ? 'var(--success)' : 'transparent',
            color: activeTab === 'tracking' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Tracked Shops
        </button>
        <button 
          className="btn" 
          onClick={() => setActiveTab('discarded')}
          style={{ 
            background: activeTab === 'discarded' ? 'var(--danger)' : 'transparent',
            color: activeTab === 'discarded' ? 'white' : 'var(--text-secondary)'
          }}
        >
          Discarded Shops
        </button>
      </div>

      {/* Content */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex-col items-center justify-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={40} className="animate-pulse" style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }} />
          <p>Loading shops...</p>
        </div>
      ) : shops.length === 0 ? (
        <div className="flex-col items-center justify-center glass-panel" style={{ height: '300px', color: 'var(--text-secondary)' }}>
          <Store size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No shops found in this category.</p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {shops.map(shop => (
            <div key={shop.id} className="card" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{shop.company_name}</h3>
              <div className="flex justify-between" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                <span>Years: <strong>{shop.shop_years}</strong></span>
                <span>Score: <strong>{shop.composite_score || 'N/A'}</strong></span>
              </div>
              
              <div className="flex gap-2">
                {activeTab !== 'tracking' && (
                  <button 
                    onClick={() => updateStatus(shop.company_name, 'tracking')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                  >
                    <CheckCircle size={16} /> Track
                  </button>
                )}
                {activeTab !== 'discarded' && (
                  <button 
                    onClick={() => updateStatus(shop.company_name, 'discarded')}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
                  >
                    <XCircle size={16} /> Discard
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
