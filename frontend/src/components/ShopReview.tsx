import { useState, useEffect, useRef } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw, Clock, ImageOff, ExternalLink, Package, Calendar, Sparkles } from 'lucide-react'
import './DataHub1688.css'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

// ── Product card identical to DataHub1688 style ──────────────────────────────
function ProductCard({ p }: { p: any }) {
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiSummary, setAiSummary] = useState(p.ai_summary || null)
  const [displayTitle, setDisplayTitle] = useState(p.english_title || p.title)

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { timeZone: 'Europe/Vilnius', dateStyle: 'medium' })
    } catch {
      return new Date(iso).toLocaleDateString()
    }
  }
  const dateStr = p.discovered_at ? formatDate(p.discovered_at) : null

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

  const handleAIAnalyze = async () => {
    setLoadingAI(true)
    try {
      const res = await fetch(`${API_BASE}/products/${p.item_id}/ai-summary`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to fetch AI summary')
      const data = await res.json()
      if (data.summary) setAiSummary(data.summary)
      if (data.english_title) setDisplayTitle(data.english_title)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="card" style={{ background: 'var(--bg-secondary)', padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', height: '220px', background: '#1a1a24', position: 'relative' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={p.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="flex items-center justify-center" style={{ height: '100%' }}><ImageOff size={32} opacity={0.3} /></div>
        )}
      </div>
      <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
          {displayTitle}
        </h4>
        
        {/* AI Section */}
        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          {aiSummary ? (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 'bold' }}>
                <Sparkles size={12} /> AI Analysis
              </div>
              {aiSummary}
            </div>
          ) : (
            <button 
              onClick={handleAIAnalyze}
              disabled={loadingAI}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: 'white',
                border: 'none',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: loadingAI ? 'wait' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '6px',
                opacity: loadingAI ? 0.7 : 1
              }}
            >
              {loadingAI ? <RefreshCw size={14} className={loadingAI ? "spin" : ""} /> : <Sparkles size={14} />}
              {loadingAI ? 'Analyzing...' : 'Analyze with AI'}
            </button>
          )}
        </div>
        <div className="flex justify-between items-center" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ color: '#a5b4fc', fontWeight: 700 }}>¥{p.price}</span>
          {soldCountText && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{soldCountText} sold</span>}
        </div>
        <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <span>ID: {p.item_id}</span>
          {salesBadge && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sales: {salesBadge}</span>}
        </div>
        {dateStr && (
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
            <Calendar size={12} /> {dateStr}
          </div>
        )}
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

// ── Modal for showing all products of a shop ──────────────────────────────────
function ShopProductsModal({ companyName, excludeIds = [], onClose }: { companyName: string, excludeIds?: string[], onClose: () => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchProducts = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/shops/name/${encodeURIComponent(companyName)}/products?page=${pageNum}&limit=100`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const json = await res.json()
      if (pageNum === 1) {
        setProducts(json.data.filter((p: any) => !excludeIds.includes(p.item_id)))
      } else {
        setProducts(prev => [...prev, ...json.data.filter((p: any) => !excludeIds.includes(p.item_id))])
      }
      setHasMore(pageNum * json.limit < json.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(1)
  }, [companyName])

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#111118', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ margin: 0, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={24} color="#6366f1" /> {companyName} - Old Products
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
            <XCircle size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {products.map((p: any) => <ProductCard key={p.item_id} p={p} />)}
          </div>
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={32} color="#6366f1" className="spin" style={{ marginBottom: '1rem' }} />
              <p>Loading products...</p>
            </div>
          )}
          
          {!loading && hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  fetchProducts(nextPage)
                }}
                style={{ padding: '0.75rem 1.5rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
              >
                Load More (100)
              </button>
            </div>
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
      const res = await fetch(`${API_BASE}/shops/${encodeURIComponent(shop.member_id)}/products?page_size=1000`)
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
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#10b981' }}>{shop.company_name}</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem' }}>
            <span>Store Age: <strong style={{ color: '#a5b4fc' }}>{shop.shop_years != null ? `${shop.shop_years} yrs` : 'N/A'}</strong></span>
            <span>·</span>
            <span>Score: <strong style={{ color: '#a5b4fc' }}>{shop.composite_score != null ? shop.composite_score : 'N/A'}</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab !== 'pending' && (
            <button onClick={() => onStatusChange(shop.company_name, 'pending')} style={actionBtn('rgba(234,179,8,0.15)', '#eab308')}>
              <Clock size={13} /> Pending
            </button>
          )}
          {shop.shop_url && (
            <a 
              href={shop.shop_url} 
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

// ── New Discoveries component ─────────────────────────────────────────────────
function NewDiscoveries({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [shopsMap, setShopsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedShopForPopup, setSelectedShopForPopup] = useState<{name: string, excludeIds: string[]} | null>(null)
  const getPastDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getPastDate(0))
  const [endDate, setEndDate] = useState(getPastDate(0))
  const [hiddenShops, setHiddenShops] = useState<Set<string>>(new Set())

  const [hasMore, setHasMore] = useState(false)

  const fetchDiscoveries = async (start: string, end: string, pageNum: number = 1, append: boolean = false) => {
    setLoading(true)
    setError(null)
    if (!append) setProducts([])
    try {
      const res = await fetch(`${API_BASE}/products/new-discoveries?start_date=${start}&end_date=${end}&page=${pageNum}&limit=500`)
      if (!res.ok) throw new Error('Failed to fetch new discoveries')
      const json = await res.json()
      const arr = Array.isArray(json.data) ? json.data : []
      if (append) {
        setProducts(prev => [...prev, ...arr])
      } else {
        setProducts(arr)
      }
      setShopsMap(prev => ({...prev, ...(json.shops || {})}))
      onCountChange(json.total)
      setHasMore(pageNum * json.limit < json.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchDiscoveries(startDate, endDate, 1, false) 
  }, [])



  // Group products by company_name, sort shops by count descending
  const shopGroups: { shopName: string; shopUrl: string | null; score: any; years: any; products: any[] }[] = []
  const seen: Record<string, number> = {}
  for (const p of products) {
    const name = p.company_name || 'Unknown Shop'
    if (seen[name] === undefined) {
      const shopInfo = shopsMap[name] || {}
      seen[name] = shopGroups.length
      shopGroups.push({
        shopName: name,
        shopUrl: shopInfo.shop_url || null,
        score: shopInfo.composite_score ?? null,
        years: shopInfo.shop_years ?? null,
        products: []
      })
    }
    shopGroups[seen[name]].products.push(p)
  }
  shopGroups.sort((a, b) => b.products.length - a.products.length)

  const visibleGroups = shopGroups.filter(g => !hiddenShops.has(g.shopName))

  const btnStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none',
    background: bg, color, cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem',
  })

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.25rem' }}>Latest Discoveries</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>From:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ background: '#1a1a24', color: '#fff', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', outline: 'none', cursor: 'text' }}
            />
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>To:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ background: '#1a1a24', color: '#fff', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', outline: 'none', cursor: 'text' }}
            />
          </div>
          <button onClick={() => fetchDiscoveries(startDate, endDate, 1, false)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <RefreshCw size={16} /> Refresh
          </button>
          {hasMore && (
            <button 
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  let allLoaded: any[] = []
                  let current = 1
                  const limit = 500
                  let totalItems = 0
                  let shopsAccum = {}
                  
                  while (true) {
                    const res = await fetch(`${API_BASE}/products/new-discoveries?start_date=${startDate}&end_date=${endDate}&page=${current}&limit=${limit}`)
                    if (!res.ok) throw new Error('Failed to fetch all discoveries')
                    const json = await res.json()
                    allLoaded.push(...json.data)
                    shopsAccum = {...shopsAccum, ...(json.shops || {})}
                    totalItems = json.total
                    if (allLoaded.length >= totalItems || json.data.length < limit) {
                      break
                    }
                    current++
                  }

                  setProducts(allLoaded)
                  setShopsMap(shopsAccum)
                  setHasMore(false)
                  onCountChange(totalItems)
                } catch (err: any) {
                  setError(err.message)
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              Load All
            </button>
          )}
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
      ) : visibleGroups.length === 0 ? (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No new products discovered between {startDate} and {endDate}.</p>
        </div>
      ) : (
        visibleGroups.map(group => (
          <div key={group.shopName} style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            {/* Shop header */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.4rem 0', color: '#10b981' }}>{group.shopName}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                    {group.products.length} new product{group.products.length !== 1 ? 's' : ''}
                  </span>
                  {group.years !== null && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Store Age: <strong style={{ color: '#a5b4fc' }}>{group.years} yrs</strong>
                    </span>
                  )}
                  {group.score !== null && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Score: <strong style={{ color: '#a5b4fc' }}>{group.score}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setSelectedShopForPopup({ name: group.shopName, excludeIds: group.products.map((p: any) => p.item_id) })}
                  style={btnStyle('rgba(16,185,129,0.15)', '#10b981')}>
                  <Package size={13} /> View Old Products
                </button>
                {group.shopUrl && (
                  <a href={group.shopUrl} target="_blank" rel="noopener noreferrer"
                    style={{ ...btnStyle('rgba(99,102,241,0.15)', '#6366f1'), textDecoration: 'none' }}>
                    <ExternalLink size={13} /> View Shop
                  </a>
                )}
                <button onClick={() => setHiddenShops(prev => new Set([...prev, group.shopName]))}
                  style={btnStyle('rgba(239,68,68,0.15)', '#f87171')}>
                  <XCircle size={13} /> Remove
                </button>
              </div>
            </div>
            {/* Product grid */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {group.products.map((p: any) => (
                  <ProductCard key={p.item_id} p={p} />
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      {selectedShopForPopup && (
        <ShopProductsModal 
          companyName={selectedShopForPopup.name} 
          excludeIds={selectedShopForPopup.excludeIds}
          onClose={() => setSelectedShopForPopup(null)} 
        />
      )}
    </div>
  )
}

// ── Main ShopReview component ────────────────────────────────────────────────
export function ShopReview() {
  const [activeTab, setActiveTab] = useState<'new_discoveries' | 'pending' | 'tracking' | 'discarded'>('new_discoveries')
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalShops, setTotalShops] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [newProductsCount, setNewProductsCount] = useState(0)

  const fetchShops = async (status: string, pageNum: number = 1, append: boolean = false) => {
    setLoading(true)
    setError(null)
    if (!append) setShops([])
    try {
      const res = await fetch(`${API_BASE}/shops?status=${status}&page=${pageNum}&limit=50`)
      if (!res.ok) throw new Error('Failed to fetch shops')
      const json = await res.json()
      
      // Sort shops so those with products (member_id exists) show up at the very top
      const sortedShops = json.data.sort((a: any, b: any) => {
        if (a.member_id && !b.member_id) return -1
        if (!a.member_id && b.member_id) return 1
        return 0
      })
      
      if (append) {
        setShops(prev => [...prev, ...sortedShops])
      } else {
        setShops(sortedShops)
      }
      setTotalShops(json.total)
      setHasMore(pageNum * json.limit < json.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    if (activeTab === 'new_discoveries') return;
    setPage(1)
    fetchShops(activeTab, 1, false) 
  }, [activeTab])

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
    { key: 'new_discoveries', label: '✨ New Discoveries', color: '#10b981', bg: 'rgba(16,185,129,0.2)' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(99,102,241,0.15)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', color: '#c7d2fe', fontWeight: 600, fontSize: '0.95rem' }}>
              <strong style={{ color: '#fff', fontSize: '1.1rem' }}>
                {activeTab === 'new_discoveries' ? newProductsCount : totalShops}
              </strong>{' '}
              {activeTab === 'new_discoveries' ? 'new products' : activeTab === 'pending' ? 'shops left' : activeTab === 'tracking' ? 'tracked shops' : 'discarded shops'}
            </div>
            {hasMore && activeTab !== 'new_discoveries' && (
              <button 
                onClick={async () => {
                  setLoading(true)
                  setError(null)
                  try {
                    let allLoaded: any[] = []
                    let current = 1
                    const limit = 1000
                    let totalItems = 0
                    
                    while (true) {
                      const res = await fetch(`${API_BASE}/shops?status=${activeTab}&page=${current}&limit=${limit}`)
                      if (!res.ok) throw new Error('Failed to fetch all shops')
                      const json = await res.json()
                      allLoaded.push(...json.data)
                      totalItems = json.total
                      if (allLoaded.length >= totalItems || json.data.length < limit) {
                        break
                      }
                      current++
                    }

                    const sortedShops = allLoaded.sort((a: any, b: any) => {
                      if (a.member_id && !b.member_id) return -1
                      if (!a.member_id && b.member_id) return 1
                      return 0
                    })
                    
                    setShops(sortedShops)
                    setTotalShops(totalItems)
                    setHasMore(false)
                  } catch (err: any) {
                    setError(err.message)
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                Load All
              </button>
            )}
            {activeTab !== 'new_discoveries' && (
              <button onClick={() => { setPage(1); fetchShops(activeTab, 1, false); }} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <RefreshCw size={16} /> Refresh
              </button>
            )}
          </div>
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

      {activeTab === 'new_discoveries' ? (
        <NewDiscoveries onCountChange={setNewProductsCount} />
      ) : (
        <>
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

          {hasMore && !loading && shops.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
              <button onClick={() => {
                const nextPage = page + 1
                setPage(nextPage)
                fetchShops(activeTab, nextPage, true)
              }}
              style={{ padding: '0.75rem 2rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                Load More Shops
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
