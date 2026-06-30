import { useState, useEffect, useRef } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw, Clock, ImageOff, ExternalLink, Package } from 'lucide-react'
import './DataHub1688.css'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

// ── Product card identical to DataHub1688 style ──────────────────────────────
function ProductCard({ p }: { p: any }) {
  const productUrl = p.product_url || (p.item_id ? `https://detail.1688.com/offer/${p.item_id}.html` : null)
  const imgSrc = p.image_url || p.img  // DB uses image_url, TMAPI uses img
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
        <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <span>ID: {p.item_id}</span>
          {salesBadge && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sales: {salesBadge}</span>}
        </div>
        <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>MOQ: {p.moq || '1'}</span>
          {productUrl && (
            <a href={productUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              View <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Single shop section ───────────────────────────────────────────────────────
function ShopSection({ shop, activeTab, onStatusChange }: { shop: any, activeTab: string, onStatusChange: (name: string, status: string) => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Lazy load products using IntersectionObserver
  useEffect(() => {
    if (!shop.member_id || loaded) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        loadProducts()
      }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [shop.member_id])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shop.member_id)}/products?page_size=10`)
      const data = await res.json()
      setProducts(data?.data?.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  const actionBtn = (bg: string, color: string) => ({
    padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none',
    background: bg, color, cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem',
  } as React.CSSProperties)

  return (
    <div ref={ref} style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      {/* Shop header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.05rem', color: '#e2e8f0' }}>{shop.company_name}</h3>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            Store Age: <strong style={{ color: '#a5b4fc' }}>{shop.shop_years} {shop.shop_years === 1 ? 'yr' : 'yrs'}</strong>
            &nbsp;·&nbsp;
            Score: <strong style={{ color: '#a5b4fc' }}>{shop.composite_score || 'N/A'}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab !== 'pending' && (
            <button onClick={() => onStatusChange(shop.company_name, 'pending')} style={actionBtn('rgba(234,179,8,0.15)', '#eab308')}>
              <Clock size={13} /> Pending
            </button>
          )}
          {shop.shop_url && (
            <a 
              href={shop.shop_url.replace('/page/index.html', '/page/offerlist.htm')} 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ ...actionBtn('rgba(99,102,241,0.15)', '#6366f1'), textDecoration: 'none' }}
            >
              <ExternalLink size={13} /> View Shop
            </a>
          )}
          {activeTab !== 'tracking' && (
            <button onClick={() => onStatusChange(shop.company_name, 'tracking')} style={actionBtn('rgba(34,197,94,0.15)', '#4ade80')}>
              <CheckCircle size={13} /> Track
            </button>
          )}
          {activeTab !== 'discarded' && (
            <button onClick={() => onStatusChange(shop.company_name, 'discarded')} style={actionBtn('rgba(239,68,68,0.15)', '#f87171')}>
              <XCircle size={13} /> Discard
            </button>
          )}
        </div>
      </div>

      {/* Products */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {!shop.member_id ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            <Package size={24} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Products not yet fetched for this shop.</p>
          </div>
        ) : loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={24} color="#6366f1" style={{ marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading products...</p>
          </div>
        ) : products.length === 0 && loaded ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            No products found for this shop.
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {products.map((p: any) => <ProductCard key={p.item_id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ShopReview component ────────────────────────────────────────────────
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
      const data = await res.json()
      
      // Sort shops so those with products (member_id exists) show up at the very top
      const sortedShops = data.sort((a: any, b: any) => {
        if (a.member_id && !b.member_id) return -1
        if (!a.member_id && b.member_id) return 1
        return 0
      })
      
      setShops(sortedShops)
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      setShops(prev => prev.filter(s => s.company_name !== companyName))
    } catch (err: any) { alert(err.message) }
  }

  const tabs = [
    { key: 'pending',   label: '🟡 New Shops',      color: '#eab308', bg: 'rgba(234,179,8,0.2)' },
    { key: 'tracking',  label: '🟢 Tracked Shops',   color: '#4ade80', bg: 'rgba(34,197,94,0.2)' },
    { key: 'discarded', label: '🔴 Discarded Shops', color: '#f87171', bg: 'rgba(239,68,68,0.2)' },
  ] as const

  return (
    <div className="datahub-wrapper">
      <div style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: '#e2e8f0' }}>
          <Store size={28} color="#6366f1" /> Shop Review System
        </h2>
        <button onClick={() => fetchShops(activeTab)} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              background: activeTab === tab.key ? tab.bg : 'transparent',
              color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.4)',
              outline: activeTab === tab.key ? `1px solid ${tab.color}` : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #f87171', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

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
        shops.map(shop => (
          <ShopSection key={shop.id} shop={shop} activeTab={activeTab} onStatusChange={updateStatus} />
        ))
      )}
      </div>
    </div>
  )
}
