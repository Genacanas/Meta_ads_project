import { useState, useEffect } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw, Clock, ChevronLeft, Package } from 'lucide-react'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

const actionBtn = (bg: string, color: string) => ({
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: 'none',
  background: bg,
  color: color,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  fontWeight: 700,
  fontSize: '0.85rem',
} as React.CSSProperties)

export function ShopReview() {
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking' | 'discarded'>('pending')
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // DEMO: abrir directamente en la tienda con productos
  const [reviewShop, setReviewShop] = useState<any | null>({
    company_name: '丹阳市诚众工具有限公司',
    shop_years: 3,
    composite_score: '4.5',
    member_id: 'b2b-22184297109962e6c6',
    status: 'pending'
  })
  const [shopProducts, setShopProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const fetchShops = async (status: string) => {
    setLoading(true)
    setError(null)
    setShops([])
    setReviewShop(null)
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

  const openReview = async (shop: any) => {
    setReviewShop(shop)
    setShopProducts([])
    if (!shop.member_id) return

    setProductsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shop.member_id)}/products?page_size=10`)
      const data = await res.json()
      setShopProducts(data?.data?.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setProductsLoading(false)
    }
  }

  const updateStatus = async (companyName: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(companyName)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      setShops(prev => prev.filter(s => s.company_name !== companyName))
      setReviewShop(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const tabs = [
    { key: 'pending',   label: '🟡 New Shops',      color: '#eab308', bg: 'rgba(234,179,8,0.2)' },
    { key: 'tracking',  label: '🟢 Tracked Shops',   color: '#4ade80', bg: 'rgba(34,197,94,0.2)' },
    { key: 'discarded', label: '🔴 Discarded Shops', color: '#f87171', bg: 'rgba(239,68,68,0.2)' },
  ] as const

  // ── REVIEW MODE ─────────────────────────────────────────────────────────────
  if (reviewShop) {
    return (
      <div style={{ padding: '2rem' }}>
        {/* Back button + shop header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setReviewShop(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#e2e8f0' }}>{reviewShop.company_name}</h2>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
              Store Age: {reviewShop.shop_years} yrs &nbsp;·&nbsp; Score: {reviewShop.composite_score || 'N/A'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          {activeTab !== 'pending' && (
            <button onClick={() => updateStatus(reviewShop.company_name, 'pending')} style={actionBtn('rgba(234,179,8,0.15)', '#eab308')}>
              <Clock size={15} /> Move to Pending
            </button>
          )}
          {activeTab !== 'tracking' && (
            <button onClick={() => updateStatus(reviewShop.company_name, 'tracking')} style={actionBtn('rgba(34,197,94,0.15)', '#4ade80')}>
              <CheckCircle size={15} /> Track this Shop
            </button>
          )}
          {activeTab !== 'discarded' && (
            <button onClick={() => updateStatus(reviewShop.company_name, 'discarded')} style={actionBtn('rgba(239,68,68,0.15)', '#f87171')}>
              <XCircle size={15} /> Discard this Shop
            </button>
          )}
        </div>

        {/* Products */}
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          <Package size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Top Products from this Shop
        </h3>

        {!reviewShop.member_id ? (
          <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            No member ID yet — run the scraper to fetch this shop's details.
          </div>
        ) : productsLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={32} color="#6366f1" style={{ marginBottom: '0.75rem' }} />
            <p>Loading products...</p>
          </div>
        ) : shopProducts.length === 0 ? (
          <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            No products found for this shop.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {shopProducts.map((item: any) => (
              <a
                key={item.item_id}
                href={`https://detail.1688.com/offer/${item.item_id}.html`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}
              >
                <img
                  src={item.img}
                  alt={item.title}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#a5b4fc', fontWeight: 700 }}>¥{item.price}</span>
                    {item.sale_info?.sale_quantity && (
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{item.sale_info.sale_quantity.toLocaleString()} sold</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── SHOP LIST MODE ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem' }}>
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
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.9rem',
              background: activeTab === tab.key ? tab.bg : 'transparent',
              color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.4)',
              outline: activeTab === tab.key ? `1px solid ${tab.color}` : 'none',
            }}
          >
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {shops.map(shop => (
            <div
              key={shop.id}
              onClick={() => openReview(shop)}
              style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.6)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
            >
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.4, wordBreak: 'break-word' }}>{shop.company_name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                <span>Store Age: <strong style={{ color: '#a5b4fc' }}>{shop.shop_years} {shop.shop_years === 1 ? 'yr' : 'yrs'}</strong></span>
                <span>Score: <strong style={{ color: '#a5b4fc' }}>{shop.composite_score || 'N/A'}</strong></span>
              </div>
              <div style={{ fontSize: '0.78rem', color: shop.member_id ? '#4ade80' : 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>
                {shop.member_id ? '✓ Products available' : '○ Click to review'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(99,102,241,0.8)', fontWeight: 600 }}>
                Click to review →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
