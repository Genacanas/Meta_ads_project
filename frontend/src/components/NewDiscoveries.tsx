import { useState, useEffect } from 'react'
import { RefreshCw, ImageOff, ExternalLink, Calendar } from 'lucide-react'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

function ProductCard({ p }: { p: any }) {
  const productUrl = p.product_url || (p.item_id ? `https://detail.1688.com/offer/${p.item_id}.html` : null)
  const imgSrc = p.image_url || p.img
  const rawSales = p.sold_count || p.sale_info?.sale_quantity
  const soldCountText = rawSales ? Number(rawSales).toLocaleString() : null

  const formatSales = (val: any) => {
    if (!val) return null
    const num = Number(val)
    if (isNaN(num)) return val
    if (num >= 1000) return Math.floor(num / 1000) + 'K+'
    return num.toString()
  }
  const salesBadge = formatSales(rawSales)

  // Format date to Europe/Vilnius
  const dateStr = p.discovered_at 
    ? new Date(p.discovered_at).toLocaleString('en-US', { timeZone: 'Europe/Vilnius', dateStyle: 'medium', timeStyle: 'short' })
    : 'Unknown Date'

  return (
    <div className="card" style={{ background: 'var(--bg-secondary)', padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ width: '100%', height: '220px', background: '#1a1a24', position: 'relative' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={p.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="flex items-center justify-center" style={{ height: '100%' }}><ImageOff size={32} opacity={0.3} /></div>
        )}
      </div>
      <div style={{ padding: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
          {p.title}
        </h4>
        
        <div className="flex justify-between items-center" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ color: '#a5b4fc', fontWeight: 700 }}>¥{p.price}</span>
          {soldCountText && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{soldCountText} sold</span>}
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <strong>Shop:</strong> {p.company_name}
        </div>

        <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <span>ID: {p.item_id}</span>
          {salesBadge && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sales: {salesBadge}</span>}
        </div>
        
        <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
          <Calendar size={12} /> {dateStr}
        </div>

        <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>MOQ: {p.moq || '1'}</span>
          {productUrl && (
            <a href={productUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              View on 1688 <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export function NewDiscoveries() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [daysAgo, setDaysAgo] = useState(3)

  const fetchDiscoveries = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/products/new-discoveries?days_ago=${daysAgo}&limit=500`)
      if (!res.ok) throw new Error('Failed to fetch new discoveries')
      const json = await res.json()
      setProducts(json.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscoveries()
  }, [daysAgo])

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '1.25rem' }}>Latest Discoveries</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing genuine new products extracted across all shops. Times are in Lithuania timezone (EEST).
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Show from last:</label>
            <select 
              value={daysAgo} 
              onChange={(e) => setDaysAgo(Number(e.target.value))}
              style={{ background: '#1a1a24', color: '#fff', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          <button 
            onClick={fetchDiscoveries} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #f87171', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={40} color="#6366f1" style={{ marginBottom: '1rem' }} />
          <p>Loading latest discoveries...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No new products discovered in the last {daysAgo} days.</p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {products.map((p: any) => <ProductCard key={p.item_id} p={p} />)}
        </div>
      )}
    </div>
  )
}
