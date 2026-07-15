import { useState, useEffect, useRef } from 'react'
import { Store, CheckCircle, XCircle, RefreshCw, Clock, ImageOff, ExternalLink, Package, Calendar, Sparkles, Star, AlertTriangle, Tag, X, Plus, Check, Pencil } from 'lucide-react'
import './DataHub1688.css'

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://backend1688-production.up.railway.app/api';

// ── Animated Checkbox Review Button (cult-ui pathLength technique via CSS) ──────────────
function AnimatedCheckButton({ onClick }: { onClick: () => void }) {
  const [checked, setChecked] = useState(false)

  const handleClick = () => {
    if (checked) return
    setChecked(true)
    setTimeout(() => onClick(), 650)
  }

  // Circumference of the checkmark path (approx) — we animate strokeDashoffset from full to 0
  const CIRCLE_DASH = 56.5   // 2πr for r=9
  const CHECK_DASH  = 18     // approximate path length of the checkmark

  return (
    <button
      title="Mark as Reviewed"
      onClick={handleClick}
      style={{
        position: 'absolute', top: '8px', left: '8px',
        background: 'rgba(0,0,0,0.65)',
        border: 'none', borderRadius: '50%',
        width: '32px', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: checked ? 'default' : 'pointer',
        zIndex: 10, padding: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background fill on check */}
        {checked && (
          <circle cx="11" cy="11" r="9" fill="rgba(34,197,94,0.15)"
            style={{ animation: 'reviewFadeIn 0.25s ease forwards' }} />
        )}
        {/* Circle ring */}
        <circle
          cx="11" cy="11" r="9"
          stroke={checked ? '#22c55e' : 'rgba(255,255,255,0.6)'}
          strokeWidth="1.8"
          fill="none"
          strokeDasharray={CIRCLE_DASH}
          strokeDashoffset={checked ? 0 : 0}
          style={{
            transition: 'stroke 0.25s ease',
          }}
        />
        {/* Animated checkmark drawn via strokeDashoffset */}
        {checked && (
          <path
            d="M6.5 11.5L9.5 14.5L15.5 8.5"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_DASH}
            strokeDashoffset={CHECK_DASH}
            style={{ animation: 'reviewCheckDraw 0.4s cubic-bezier(0.22,1,0.36,1) 0.05s forwards' }}
          />
        )}
      </svg>
    </button>
  )
}


// ── Product card identical to DataHub1688 style ──────────────────────────────
function ProductCard({ 
  p, 
  hidePotentialBorder, 
  onPotentialChange,
  showReviewButton,
  onReview,
  isDuplicateTab,
  showTagSelector,
  availableTags,
  onTagChange,
  bulkMode,
  isSelected,
  onSelect,
  readOnly
}: { 
  p: any, 
  hidePotentialBorder?: boolean, 
  onPotentialChange?: (item_id: string, is_potential: boolean) => void,
  showReviewButton?: boolean,
  onReview?: (item_id: string) => void,
  isDuplicateTab?: boolean,
  showTagSelector?: boolean,
  availableTags?: string[],
  onTagChange?: (item_id: string, newTag: string | null) => void,
  bulkMode?: boolean,
  isSelected?: boolean,
  onSelect?: (id: string) => void,
  readOnly?: boolean
}) {
  const [loadingAI, setLoadingAI] = useState(false)
  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState(!!p.ai_summary)
  const [aiSummary, setAiSummary] = useState(p.ai_summary || null)
  const [displayTitle, setDisplayTitle] = useState(p.english_title || p.title)
  const [isPotential, setIsPotential] = useState(p.is_potential || false)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [localTag, setLocalTag] = useState<string | null>(p.tag || null)
  const [detectingCategory, setDetectingCategory] = useState(false)
  const [localCategory, setLocalCategory] = useState(p.category || null)

  const handleDetectCategory = async () => {
    setDetectingCategory(true)
    try {
      const res = await fetch(`${API_BASE}/products/${p.item_id}/category-detect`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to detect category')
      const data = await res.json()
      if (data.category) setLocalCategory(data.category)
    } catch (e) {
      console.error(e)
    } finally {
      setDetectingCategory(false)
    }
  }

  useEffect(() => {
    setLocalTag(p.tag || null)
  }, [p.tag])

  const handleUpdateTag = async (newTag: string | null) => {
    setTagOpen(false)
    setTagSearch('')
    setLocalTag(newTag)
    if (onTagChange) onTagChange(p.item_id, newTag)
    try {
      await fetch(`${API_BASE}/products/${p.item_id}/tag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag })
      })
    } catch (e) {
      console.error('Failed to update tag', e)
    }
  }

  const togglePotential = async () => {
    const newVal = !isPotential
    setIsPotential(newVal) // optimistic
    const newTag = newVal ? 'PENDING' : null
    setLocalTag(newTag)
    if (onPotentialChange) {
      onPotentialChange(p.item_id, newVal)
    }
    if (onTagChange) {
      onTagChange(p.item_id, newTag)
    }
    try {
      await fetch(`${API_BASE}/products/${p.item_id}/potential`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_potential: newVal })
      })
    } catch (e) {
      console.error(e)
      setIsPotential(!newVal) // revert on error
      setLocalTag(p.tag || null)
      if (onPotentialChange) {
        onPotentialChange(p.item_id, !newVal)
      }
    }
  }

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
    setHasBeenAnalyzed(true)
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

  const handleReview = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: [p.item_id] })
      })
      if (!res.ok) throw new Error('Failed to review')
      if (onReview) onReview(p.item_id)
    } catch (e) {
      console.error(e)
    }
  }

  const hasGoldenBorder = isPotential && !hidePotentialBorder
  const isExactDuplicate = p.duplicate_status && p.duplicate_status.includes('EXACT')
  const isDoubtfulDuplicate = p.duplicate_status && p.duplicate_status.includes('DOUBTFUL')
  const hasDuplicateBorder = isDoubtfulDuplicate || isExactDuplicate
  const highlightShadow = hasBeenAnalyzed && !hasGoldenBorder && !hasDuplicateBorder ? '0 0 0 2px #6366f1' : 'none'
  const finalBoxShadow = hasGoldenBorder
    ? '0 0 0 2px #f59e0b'
    : hasDuplicateBorder
    ? '0 0 0 2px #ef4444'
    : highlightShadow

  const blurActive = hasDuplicateBorder && isDuplicateTab

  return (
    <div className="card" style={{ background: isExactDuplicate ? 'rgba(239, 68, 68, 0.3)' : 'var(--bg-secondary)', padding: 0, borderRadius: '12px', border: hasDuplicateBorder ? '1px solid rgba(239,68,68,0.6)' : '1px solid var(--border-color)', boxShadow: finalBoxShadow, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: tagOpen ? 50 : 1 }}>
      <div style={{ width: '100%', height: '220px', background: '#1a1a24', position: 'relative', overflow: 'hidden', borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }}>
        {!readOnly && bulkMode && (
          <div
            onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(p.item_id); }}
            style={{ position: 'absolute', top: '8px', left: '8px', width: '22px', height: '22px', borderRadius: '6px', border: isSelected ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.5)', background: isSelected ? '#6366f1' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }}
          >
            {isSelected && <Check size={14} color="white" />}
          </div>
        )}
        {!readOnly && (
          <button 
            onClick={togglePotential}
            style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
            <Star size={18} color={isPotential ? '#f59e0b' : '#fff'} fill={isPotential ? '#f59e0b' : 'none'} />
          </button>
        )}
        {!readOnly && showReviewButton && (
          <AnimatedCheckButton onClick={handleReview} />
        )}
        {(isExactDuplicate || isDoubtfulDuplicate) && (
          <a 
            href={p.duplicate_of_item_id ? `https://detail.1688.com/offer/${p.duplicate_of_item_id}.html` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            title={isExactDuplicate ? "Exact Duplicate! Click to view original product" : "Possible duplicate. Click to view original product"}
            style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(239, 68, 68, 0.95)', border: '1px solid #b91c1c', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', textDecoration: 'none' }}>
            <AlertTriangle size={18} color="#fff" />
          </a>
        )}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={p.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onMouseEnter={blurActive ? (e) => { (e.currentTarget as HTMLImageElement).style.filter = 'none'; (e.currentTarget as HTMLImageElement).style.opacity = '1' } : undefined}
            onMouseLeave={blurActive ? (e) => { (e.currentTarget as HTMLImageElement).style.filter = 'blur(8px) grayscale(50%)'; (e.currentTarget as HTMLImageElement).style.opacity = '0.7' } : undefined}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'filter 0.3s ease, opacity 0.3s ease', ...(blurActive ? { filter: 'blur(8px) grayscale(50%)', opacity: 0.7 } : {}) }}
          />
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
          {aiSummary && (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 'bold' }}>
                <Sparkles size={12} /> AI Analysis
              </div>
              {aiSummary}
            </div>
          )}
          {!readOnly && !aiSummary && (
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
          
          {!readOnly && !localCategory && (
            <button
              onClick={handleDetectCategory}
              disabled={detectingCategory}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', cursor: detectingCategory ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
            >
              {detectingCategory ? <RefreshCw size={16} className="spin" /> : <Tag size={16} />}
              {detectingCategory ? 'Detecting...' : 'Analyze Category'}
            </button>
          )}
          
          {localCategory && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <strong>Category:</strong> {localCategory}
            </div>
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
        
        {/* Tag Selector */}
        {!readOnly && showTagSelector && (
          <div style={{ marginBottom: '0.5rem', position: 'relative' }}>
            {localTag ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'} onClick={() => setTagOpen(!tagOpen)}>
                <Tag size={12} style={{ marginRight: '6px', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localTag}</span>
                <div 
                  onClick={(e) => { e.stopPropagation(); handleUpdateTag(null); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', marginLeft: '6px', marginRight: '-4px', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={14} style={{ opacity: 0.9, flexShrink: 0 }} />
                </div>
              </div>
            ) : (
              <button onClick={() => setTagOpen(!tagOpen)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <Plus size={10} style={{ marginRight: '2px' }} /> tag
              </button>
            )}
            
            {tagOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setTagOpen(false)} />
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#1e1e2d', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 50, width: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  <input 
                    type="text" 
                    placeholder="New tag..." 
                    value={tagSearch} 
                    onChange={e => setTagSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tagSearch.trim()) {
                        handleUpdateTag(tagSearch.trim());
                      }
                    }}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '8px', outline: 'none' }}
                  />
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {availableTags && availableTags.length > 0 ? (
                      availableTags.filter(t => t && t.toLowerCase().includes(tagSearch.toLowerCase())).map(t => (
                        <div 
                          key={t} 
                          onClick={() => handleUpdateTag(t)}
                          style={{ padding: '6px', fontSize: '0.8rem', color: '#e2e8f0', cursor: 'pointer', borderRadius: '4px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {t}
                        </div>
                      ))
                    ) : (
                      !tagSearch.trim() && <div style={{ padding: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No tags yet</div>
                    )}
                    {tagSearch.trim() && (!availableTags || !availableTags.some(t => t && t.toLowerCase() === tagSearch.trim().toLowerCase())) && (
                      <div 
                        onClick={() => handleUpdateTag(tagSearch.trim())}
                        style={{ padding: '6px', fontSize: '0.8rem', color: '#10b981', cursor: 'pointer', borderRadius: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '4px' }}
                      >
                        <Plus size={10} style={{ marginRight: '4px', display: 'inline-block' }} />
                        Create "{tagSearch.trim()}"
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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

// ── Global cache for Old Products to prevent refetching during session ─────
const oldProductsCache: Record<string, { products: any[], tmapiPage: number, tmapiHasMore: boolean, fromDb: boolean }> = {}

// ── Modal for showing all products of a shop ──────────────────────────────────
function ShopProductsModal({ companyName, excludeIds = [], onClose }: { companyName: string, excludeIds?: string[], onClose: () => void }) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tmapiPage, setTmapiPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [fromDb, setFromDb] = useState(false)

  const fetchInitial = async () => {
    if (oldProductsCache[companyName]) {
      const cache = oldProductsCache[companyName]
      setProducts(cache.products)
      setTmapiPage(cache.tmapiPage)
      setHasMore(cache.tmapiHasMore)
      setFromDb(cache.fromDb)
      return
    }

    setLoading(true)
    try {
      // 1. Try DB first
      const res = await fetch(`${API_BASE}/shops/name/${encodeURIComponent(companyName)}/products?page=1&limit=1000`)
      if (!res.ok) throw new Error('Failed to fetch local products')
      const json = await res.json()
      
      const filtered = json.data.filter((p: any) => !excludeIds.includes(p.item_id))
      
      if (filtered.length > 0) {
        setProducts(filtered)
        setFromDb(true)
        setHasMore(true) // Always allow fetching more from TMAPI
        oldProductsCache[companyName] = { products: filtered, tmapiPage: 1, tmapiHasMore: true, fromDb: true }
      } else {
        // 2. No local products, try TMAPI directly
        await fetchTmapi(1, [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTmapi = async (pageToFetch: number, currentProducts: any[]) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/shops/name/${encodeURIComponent(companyName)}/tmapi-products?page=${pageToFetch}&limit=20`)
      if (!res.ok) throw new Error('Failed to fetch from TMAPI')
      const json = await res.json()
      
      const newItems = json.data.filter((p: any) => !excludeIds.includes(p.item_id) && !currentProducts.some(cp => cp.item_id === p.item_id))
      
      const merged = [...currentProducts, ...newItems]
      const more = pageToFetch * json.limit < json.total

      setProducts(merged)
      setTmapiPage(pageToFetch)
      setHasMore(more)
      setFromDb(false)
      
      oldProductsCache[companyName] = { products: merged, tmapiPage: pageToFetch, tmapiHasMore: more, fromDb: false }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitial()
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
          {products.length === 0 && !loading && !hasMore ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'rgba(255,255,255,0.4)' }}>
              <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>No old products found</p>
              <p style={{ fontSize: '0.9rem' }}>All known products for this shop are already displayed as new discoveries.</p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {products.map((p: any) => <ProductCard key={p.item_id} p={p} readOnly={true} />)}
            </div>
          )}
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={32} color="#6366f1" className="spin" style={{ marginBottom: '1rem' }} />
              <p>Loading products from 1688...</p>
            </div>
          )}
          
          {!loading && hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => {
                  const nextPage = fromDb ? 1 : tmapiPage + 1
                  fetchTmapi(nextPage, products)
                }}
                style={{ padding: '0.75rem 1.5rem', background: '#312e81', border: '1px solid #4f46e5', color: '#e0e7ff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
              >
                Search more on 1688
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
          {activeTab !== 'not_right_now' && (
            <button onClick={() => onStatusChange(shop.company_name, 'not_right_now')} style={actionBtn('rgba(168,85,247,0.15)', '#a855f7')}>
              <Clock size={13} /> Not Right Now
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

// ── New Discoveries ─────────────────────────────────────────────────────────
function NewDiscoveries({ onCountChange, onStatusChange }: { onCountChange: React.Dispatch<React.SetStateAction<number>>, onStatusChange: (name: string, status: string) => void }) {
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

  const [startDate, setStartDate] = useState(() => localStorage.getItem('newDiscoveries_startDate') || getPastDate(0))
  const [endDate, setEndDate] = useState(() => localStorage.getItem('newDiscoveries_endDate') || getPastDate(0))

  useEffect(() => {
    localStorage.setItem('newDiscoveries_startDate', startDate)
  }, [startDate])

  useEffect(() => {
    localStorage.setItem('newDiscoveries_endDate', endDate)
  }, [endDate])

  const [hiddenShops, setHiddenShops] = useState<Set<string>>(new Set())

  const [hasMore, setHasMore] = useState(false)

  const fetchDiscoveries = async (start: string, end: string, pageNum: number = 1, append: boolean = false) => {
    setLoading(true)
    setError(null)
    if (!append) setProducts([])
    try {
      const res = await fetch(`${API_BASE}/products/new-discoveries?start_date=${start}&end_date=${end}&page=${pageNum}&limit=5000`)
      if (!res.ok) throw new Error('Failed to fetch new discoveries')
      const json = await res.json()
      const arr = Array.isArray(json.data) ? json.data : []
      
      const sortedArr = [...arr].sort((a, b) => {
        // Priority 1: non-duplicates first
        const isADup = a.duplicate_status && (a.duplicate_status.includes('EXACT') || a.duplicate_status.includes('DOUBTFUL'));
        const isBDup = b.duplicate_status && (b.duplicate_status.includes('EXACT') || b.duplicate_status.includes('DOUBTFUL'));
        if (isADup && !isBDup) return 1;
        if (!isADup && isBDup) return -1;

        // Priority 2 (lowest): sort by sold_count descending
        const parseSales = (str: string | null | undefined): number => {
          if (!str) return 0;
          const s = String(str);
          const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
          if (s.toLowerCase().includes('k')) return num * 1000;
          if (s.includes('万') || s.toLowerCase().includes('w')) return num * 10000;
          if (s.toLowerCase().includes('m')) return num * 1000000;
          return num;
        };
        return parseSales(b.sold_count) - parseSales(a.sold_count);
      });

      if (append) {
        setProducts(prev => [...prev, ...sortedArr])
      } else {
        setProducts(sortedArr)
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

  const markAsReviewed = async (shopName: string | string[], productIds: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/products/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: productIds })
      })
      if (!res.ok) throw new Error('Failed to mark as reviewed')
      setHiddenShops(prev => {
        const next = new Set(prev)
        if (Array.isArray(shopName)) {
          shopName.forEach(s => next.add(s))
        } else {
          next.add(shopName)
        }
        return next
      })
      onCountChange(prev => Math.max(0, prev - productIds.length)) // optimistic count update
    } catch (err: any) {
      alert(err.message)
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
  shopGroups.sort((a, b) => {
    // Primary: more products = higher priority
    if (b.products.length !== a.products.length) return b.products.length - a.products.length;
    // Tiebreaker (lowest priority): shop with highest avg sold_count first
    const parseSales = (str: string | null | undefined): number => {
      if (!str) return 0;
      const s = String(str);
      const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
      if (s.toLowerCase().includes('k')) return num * 1000;
      if (s.includes('万') || s.toLowerCase().includes('w')) return num * 10000;
      if (s.toLowerCase().includes('m')) return num * 1000000;
      return num;
    };
    const avgSales = (group: typeof a) =>
      group.products.reduce((acc, p) => acc + parseSales(p.sold_count), 0) / (group.products.length || 1);
    return avgSales(b) - avgSales(a);
  })

  const visibleGroups = shopGroups.filter(g => !hiddenShops.has(g.shopName) && g.products.length > 0)
  const multiGroups = visibleGroups.filter(g => g.products.length > 1)
  const singleGroups = visibleGroups.filter(g => g.products.length === 1)
  const singleProducts = singleGroups.map(g => ({
    ...g.products[0],
    shopName: g.shopName,
    shopUrl: g.shopUrl
  }))

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
                  const limit = 5000
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
        <>
          {multiGroups.map(group => (
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
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                <button onClick={() => { onStatusChange(group.shopName, 'not_right_now'); setHiddenShops(prev => new Set([...prev, group.shopName])); }}
                  style={btnStyle('rgba(168,85,247,0.15)', '#a855f7')}>
                  <Clock size={13} /> Not Right Now
                </button>
                <button onClick={() => { onStatusChange(group.shopName, 'discarded'); setHiddenShops(prev => new Set([...prev, group.shopName])); }}
                  style={btnStyle('rgba(239,68,68,0.15)', '#f87171')}>
                  <XCircle size={13} /> Discard
                </button>
                <button onClick={() => markAsReviewed(group.shopName, group.products.map((p: any) => p.item_id))}
                  style={btnStyle('rgba(34,197,94,0.15)', '#22c55e')}>
                  <CheckCircle size={13} /> Mark as Reviewed
                </button>
              </div>
            </div>
            {/* Product grid */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {group.products.map((p: any) => (
                  <ProductCard 
                    key={p.item_id} 
                    p={p} 
                    showReviewButton={true}
                    isDuplicateTab={true}
                    onReview={(id) => {
                      setProducts(prev => prev.filter(item => item.item_id !== id))
                      onCountChange(prev => Math.max(0, prev - 1))
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button onClick={() => markAsReviewed(group.shopName, group.products.map((p: any) => p.item_id))}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #22c55e', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <CheckCircle size={15} /> Mark all {group.products.length} products as Reviewed
                </button>
              </div>
            </div>
          </div>
          ))}

          {singleProducts.length > 0 && (
            <div style={{ marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.4rem 0', color: '#f59e0b' }}>Single Product Shops</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>These shops only have 1 new product.</span>
                </div>
                <button 
                  onClick={() => markAsReviewed(
                    singleProducts.map(p => p.shopName), 
                    singleProducts.map(p => p.item_id)
                  )}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #22c55e', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <CheckCircle size={15} /> Mark all {singleProducts.length} as Reviewed
                </button>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  {singleProducts.map((p: any) => (
                    <ProductCard 
                      key={p.item_id} 
                      p={p} 
                      showReviewButton={false} 
                      isDuplicateTab={true}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
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

// ── Potential Products ────────────────────────────────────────────────────────
function PotentialProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [activeTagFilter, setActiveTagFilter] = useState<string | 'all' | 'none'>('PENDING')
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [globalTagCounts, setGlobalTagCounts] = useState<Record<string, number>>({})
  // Feature 2: bulk select
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTag, setBulkTag] = useState<string>('')
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  // Feature 3: tag rename
  const [tagToRename, setTagToRename] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const tagCounts = products.reduce((acc, p) => {
    if (p.tag) acc[p.tag] = (acc[p.tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const dropdownTags = Array.from(new Set([...Object.keys(tagCounts), ...globalTags]))
  const kanbanTags = Array.from(new Set([...Object.keys(tagCounts), ...Object.keys(globalTagCounts)]))

  const handleRenameTag = async () => {
    if (!tagToRename || !renameValue.trim() || renameValue === tagToRename) return
    const oldName = tagToRename
    const newName = renameValue.trim()
    try {
      await fetch(`${API_BASE}/products/tags/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_name: oldName, new_name: newName })
      })
      setProducts(prev => prev.map(p => p.tag === oldName ? { ...p, tag: newName } : p))
      setGlobalTagCounts(prev => {
        const next = { ...prev }
        next[newName] = next[oldName] || 0
        delete next[oldName]
        return next
      })
      setGlobalTags(prev => prev.map(t => t === oldName ? newName : t))
      if (activeTagFilter === oldName) setActiveTagFilter(newName)
      setTagToRename(null)
      setRenameValue('')
    } catch (e) {
      console.error('Failed to rename tag', e)
    }
  }

  const handleDeleteTag = async (tag: string) => {
    try {
      await fetch(`${API_BASE}/products/tags/delete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: tag })
      })
      setProducts(prev => prev.map(p => p.tag === tag ? { ...p, tag: null } : p))
      setTagToDelete(null)
      setGlobalTagCounts(prev => {
        const next = { ...prev }
        delete next[tag]
        return next
      })
      if (activeTagFilter === tag) setActiveTagFilter('all')
    } catch (e) {
      console.error('Failed to delete tag', e)
    }
  }

  const visibleProducts = activeTagFilter === 'all' 
    ? products 
    : activeTagFilter === 'none'
    ? products.filter(p => !p.tag)
    : products.filter(p => p.tag === activeTagFilter)

  const fetchPotential = async (pageNum: number, append: boolean = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/products/potential?page=${pageNum}&limit=100`)
      if (!res.ok) throw new Error('Failed to fetch potential products')
      const json = await res.json()
      const arr = Array.isArray(json.data) ? json.data : []
      if (append) {
        setProducts(prev => [...prev, ...arr])
      } else {
        setProducts(arr)
      }
      setHasMore(pageNum * (json.limit || 100) < (json.total || 0))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGlobalTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/tags/summary`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) setGlobalTags(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch global tags', e)
    }
  }

  const fetchGlobalTagCounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/potential/tags/counts`)
      if (res.ok) {
        const json = await res.json()
        if (json.counts) setGlobalTagCounts(json.counts)
      }
    } catch (e) {
      console.error('Failed to fetch global tag counts', e)
    }
  }

  useEffect(() => {
    fetchPotential(1, false)
    fetchGlobalTags()
    fetchGlobalTagCounts()
  }, [])

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #f87171', padding: '1rem', borderRadius: '8px', color: '#fca5a5', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Kanban Filter Bar */}
      {products.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setActiveTagFilter('all')}
            style={{ padding: '6px 12px', borderRadius: '16px', background: activeTagFilter === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', border: activeTagFilter === 'all' ? '1px solid #6366f1' : '1px solid transparent', color: activeTagFilter === 'all' ? '#a5b4fc' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}>
            All
          </button>
          
          {kanbanTags.map(tag => (
            <div key={tag} style={{ display: 'flex', alignItems: 'center', background: activeTagFilter === tag ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.05)', border: activeTagFilter === tag ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>
              <button 
                onClick={() => setActiveTagFilter(tag)}
                style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {tag} <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem' }}>{globalTagCounts[tag] !== undefined ? globalTagCounts[tag] : (tagCounts[tag] || 0)}</span>
              </button>
              <button
                onClick={() => { setTagToRename(tag); setRenameValue(tag); }}
                style={{ padding: '6px 8px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(245, 158, 11, 0.1)', color: 'inherit', opacity: 0.7, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
                title="Rename tag"
              >
                <Pencil size={13} />
              </button>
              <button 
                onClick={() => setTagToDelete(tag)} 
                style={{ padding: '6px 12px', background: 'transparent', border: 'none', borderLeft: '1px solid rgba(245, 158, 11, 0.1)', color: 'inherit', opacity: 0.7, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          
          <button 
            onClick={() => setActiveTagFilter('none')}
            style={{ padding: '6px 12px', borderRadius: '16px', background: activeTagFilter === 'none' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.05)', border: activeTagFilter === 'none' ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}>
            Untagged
          </button>

          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '16px', background: bulkMode ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: bulkMode ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.2)', color: bulkMode ? '#a5b4fc' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
          >
            {bulkMode ? '✕ Cancel' : '☑ Select'}
          </button>
        </div>
      )}

      {tagToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e2d', padding: '2rem', borderRadius: '12px', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} /> Delete Tag "{tagToDelete}"</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              This action will remove the tag <strong>"{tagToDelete}"</strong> from the {globalTagCounts[tagToDelete] !== undefined ? globalTagCounts[tagToDelete] : (tagCounts[tagToDelete] || 0)} products that currently have it. 
              <br/><br/>
              The products themselves will <strong>not</strong> be deleted, they will just lose their tag.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setTagToDelete(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDeleteTag(tagToDelete)} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Confirm Deletion</button>
            </div>
          </div>
        </div>
      )}

      {tagToRename && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e2d', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} /> Rename Tag</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>New name for <strong>"{tagToRename}"</strong>:</p>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameTag(); if (e.key === 'Escape') setTagToRename(null); }}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', fontSize: '1rem', marginBottom: '1.5rem', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setTagToRename(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRenameTag} disabled={!renameValue.trim() || renameValue === tagToRename} style={{ padding: '8px 16px', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, opacity: (!renameValue.trim() || renameValue === tagToRename) ? 0.5 : 1 }}>Rename</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {visibleProducts.map(p => (
          <ProductCard 
            key={p.item_id} 
            p={p} 
            hidePotentialBorder={true}
            showTagSelector={true}
            availableTags={dropdownTags}
            onTagChange={(id, newTag) => {
              const oldItem = products.find(item => item.item_id === id)
              const oldTag = oldItem?.tag
              setProducts(prev => prev.map(item => item.item_id === id ? { ...item, tag: newTag } : item))
              
              setGlobalTagCounts(prev => {
                const next = { ...prev }
                if (oldTag && next[oldTag]) next[oldTag]--
                if (newTag) next[newTag] = (next[newTag] || 0) + 1
                return next
              })
            }}
            onPotentialChange={(id, isPot) => {
              if (!isPot) {
                setProducts(prev => prev.filter(item => item.item_id !== id))
              }
            }}
            bulkMode={bulkMode}
            isSelected={selectedIds.has(p.item_id)}
            onSelect={(id) => {
              setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
          />
        ))}
      </div>

      {bulkMode && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#1e1e2d', border: '1px solid #6366f1', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{selectedIds.size} selected</span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setBulkTagOpen(!bulkTagOpen)}
              style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', minWidth: '140px', textAlign: 'left' }}
            >
              {bulkTag || 'Choose tag...'} ▾
            </button>
            {bulkTagOpen && (
              <div style={{ position: 'absolute', bottom: '110%', left: 0, background: '#1e1e2d', border: '1px solid var(--border-color)', borderRadius: '8px', minWidth: '200px', zIndex: 201, overflow: 'hidden' }}>
                <div style={{ padding: '8px' }}>
                  <input
                    autoFocus
                    placeholder="New tag..."
                    value={bulkTag}
                    onChange={e => setBulkTag(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem', padding: '4px' }}
                  />
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', maxHeight: '160px', overflowY: 'auto' }}>
                  {dropdownTags.map(t => (
                    <div key={t} onClick={() => { setBulkTag(t); setBulkTagOpen(false); }} style={{ padding: '8px 12px', cursor: 'pointer', color: '#f59e0b', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{t}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              if (!bulkTag) return
              const ids = Array.from(selectedIds)
              await fetch(`${API_BASE}/products/bulk/tag`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_ids: ids, tag: bulkTag })
              })
              setProducts(prev => prev.map(p => selectedIds.has(p.item_id) ? { ...p, tag: bulkTag } : p))
              setGlobalTagCounts(prev => {
                const next = { ...prev }
                next[bulkTag] = (next[bulkTag] || 0) + ids.length
                return next
              })
              setSelectedIds(new Set())
              setBulkMode(false)
              setBulkTag('')
            }}
            style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Apply
          </button>
          <button onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {loading && (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <RefreshCw size={24} color="#6366f1" className="spin" />
        </div>
      )}

      {hasMore && !loading && (
         <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
           <button onClick={() => {
             const n = page + 1
             setPage(n)
             fetchPotential(n, true)
           }} style={{ padding: '0.75rem 2rem', background: '#312e81', color: '#fff', border: '1px solid #4f46e5', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
             Load More
           </button>
         </div>
      )}
      {!loading && products.length === 0 && (
         <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <Star size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No potential products saved yet.</p>
         </div>
      )}
    </div>
  )
}

// ── Main ShopReview component ────────────────────────────────────────────────
export function ShopReview() {
  const [activeTab, setActiveTab] = useState<'new_discoveries' | 'pending' | 'tracking' | 'discarded' | 'not_right_now' | 'potential_products'>(() => {
    return (localStorage.getItem('shopReview_activeTab') as any) || 'new_discoveries'
  })
  const [potentialCount, setPotentialCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/products/potential?page=1&limit=1`)
      .then(res => res.json())
      .then(data => setPotentialCount(data.total || 0))
      .catch(console.error)
  }, [])

  useEffect(() => {
    localStorage.setItem('shopReview_activeTab', activeTab)
  }, [activeTab])

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
    if (activeTab === 'new_discoveries' || activeTab === 'potential_products') return;
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
    { key: 'not_right_now', label: '⏳ Not Right Now', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
    { key: 'discarded', label: '🔴 Discarded Shops', color: '#f87171', bg: 'rgba(239,68,68,0.2)' },
    { key: 'potential_products', label: '⭐ Potential', color: '#f59e0b', bg: 'rgba(245,158,11,0.2)' },
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
                {activeTab === 'new_discoveries' ? newProductsCount : activeTab === 'potential_products' ? (potentialCount ?? '') : totalShops}
              </strong>{' '}
              {activeTab === 'new_discoveries' ? 'new products' : activeTab === 'potential_products' ? 'Saved products' : activeTab === 'pending' ? 'shops left' : activeTab === 'tracking' ? 'tracked shops' : activeTab === 'not_right_now' ? 'shops waiting' : 'discarded shops'}
            </div>
            {hasMore && activeTab !== 'new_discoveries' && activeTab !== 'potential_products' && (
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
            {activeTab !== 'new_discoveries' && activeTab !== 'potential_products' && (
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
        <NewDiscoveries onCountChange={setNewProductsCount} onStatusChange={updateStatus} />
      ) : activeTab === 'potential_products' ? (
        <PotentialProducts />
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
