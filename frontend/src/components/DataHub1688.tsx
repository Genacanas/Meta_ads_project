import { useState, useEffect } from 'react'
import { Activity, Database, RefreshCw, LayoutTemplate, PackageSearch, ImageOff, ExternalLink } from 'lucide-react'
import './DataHub1688.css'

export function DataHub1688() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [whitelist, setWhitelist] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Check status
      const statusRes = await fetch(`${import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'}/status`)
      if (statusRes.ok) {
        setBackendStatus('Online')
      } else {
        setBackendStatus('Error')
      }
      
      // Get whitelist categories
      const wlRes = await fetch(`${import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'}/whitelist`)
      if (wlRes.ok) {
        const data = await wlRes.json()
        setWhitelist(data)
      } else {
        throw new Error('Could not fetch whitelist')
      }
    } catch (err) {
      setBackendStatus('Offline')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async (catId: string, catName: string) => {
    setSelectedCategory({ id: catId, name: catName })
    setLoadingProducts(true)
    setError(null)
    setProducts([])
    
    try {
      const res = await fetch(`${import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'}/products/${catId}?page_size=20`)
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to fetch products')
      }
      const result = await res.json()
      
      if (result.data && result.data.items) {
        setProducts(result.data.items)
      } else {
        setError('No items found or insufficient API balance.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="datahub-wrapper">
      <div className="app-layout">
        <header className="header glass-nav">
          <div className="container nav-content">
            <div className="logo">
              <LayoutTemplate size={28} className="text-gradient" />
              1688 Data Hub
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendStatus === 'Online' ? 'var(--success)' : 'var(--danger)' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Backend: {backendStatus}</span>
              </div>
              <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
                <RefreshCw size={18} className={loading ? "animate-pulse" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="container main-content animate-fade-in flex gap-6" style={{ alignItems: 'flex-start' }}>
          
          {/* Sidebar: Whitelist Categories */}
          <aside className="glass-panel" style={{ width: '300px', padding: '1.5rem', flexShrink: 0, position: 'sticky', top: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} className="text-gradient" /> Target Categories
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {whitelist.length} categories whitelisted for extraction. Click one to preview live results.
            </p>
            
            <div className="flex flex-col gap-2" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {loading ? (
                <div className="flex justify-center padding-y-4"><RefreshCw className="animate-pulse" /></div>
              ) : (
                whitelist.map(cat => {
                  const isActive = selectedCategory?.id === cat.id;
                  return (
                    <button 
                      key={cat.id} 
                      className="btn"
                      onClick={() => fetchProducts(cat.id, cat.name_en || cat.name)}
                      style={{ 
                        justifyContent: 'flex-start', 
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        background: isActive ? 'var(--bg-glass)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '8px'
                      }}
                    >
                      {cat.name_en || cat.name}
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Main Area: Product Preview */}
          <section className="flex-col" style={{ flex: 1, minWidth: 0 }}>
            <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px' }}>
              
              {!selectedCategory ? (
                <div className="flex-col items-center justify-center" style={{ height: '400px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <PackageSearch size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3>Select a category to preview</h3>
                  <p style={{ marginTop: '0.5rem', maxWidth: '400px' }}>This will trigger a live API request to 1688 via TMAPI and display real-time product data.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center" style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="text-gradient">{selectedCategory.name}</span> Products
                      </h2>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.25rem' }}>
                        Showing top results from 1688
                      </p>
                    </div>
                    <div className="flex items-center gap-2" style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem' }}>
                      <Activity size={16} className={loadingProducts ? "animate-pulse text-gradient" : ""} />
                      {loadingProducts ? "Fetching Live Data..." : `${products.length} Items Loaded`}
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
                      <strong>Error:</strong> {error}
                    </div>
                  )}

                  {loadingProducts ? (
                    <div className="flex-col items-center justify-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={40} className="animate-pulse" style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }} />
                      <p>Scraping 1688 API...</p>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                      {products.map((p, idx) => (
                        <div key={p.item_id || idx} className="card" style={{ background: 'var(--bg-secondary)', padding: '0', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ width: '100%', height: '220px', background: '#1a1a24', position: 'relative' }}>
                            {p.img ? (
                              <img src={p.img} alt={p.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div className="flex items-center justify-center" style={{ height: '100%' }}><ImageOff size={32} opacity={0.3} /></div>
                            )}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {p.currency} {p.price}
                            </div>
                          </div>
                          <div style={{ padding: '1rem' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                              {p.title}
                            </h4>
                            <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <span>MOQ: {p.moq || '1'}</span>
                              <a href={p.product_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                View <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !error && (
                      <div className="flex-col items-center justify-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>
                        <p>No products returned for this category.</p>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
