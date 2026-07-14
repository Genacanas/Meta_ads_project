import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ExternalLink, Inbox, Folder, FolderOpen, ChevronRight, ChevronDown, BarChart2 } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://backend1688-production.up.railway.app/api';

interface NovtraProduct {
  id: number;
  title: string;
  body: string;
  amazon_category: string;
  similarity_score: number;
  is_winner?: boolean;
  thumbnail_url?: string;
  roas?: string;
  total_profit?: number;
  avg_cpc?: string;
  eu_reach?: string;
  ad_type?: string;
  is_active?: boolean;
}

interface CategoryNode {
  id: string;
  name: string;
  childCount: number;
}

const TreeNode = ({ node, level = 0, selectedCat, onSelect }: { node: CategoryNode, level?: number, selectedCat: string | null, onSelect: (name: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.name);

    if (!node.childCount) return;

    if (!expanded && children.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/amazon-categories?parent_id=${node.id}`);
        if (res.ok) {
          const data = await res.json();
          setChildren(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching children", err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const isSelected = selectedCat === node.name;

  return (
    <div style={{ marginLeft: level === 0 ? '0' : '1rem', marginTop: '0.25rem' }}>
      <div 
        onClick={handleToggle}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem', 
          borderRadius: '6px',
          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
          cursor: 'pointer',
          color: isSelected ? '#818cf8' : node.childCount > 0 ? '#e2e8f0' : '#94a3b8',
          userSelect: 'none',
          transition: 'all 0.2s',
          borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = expanded ? 'rgba(255,255,255,0.02)' : 'transparent';
        }}
      >
        <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {node.childCount > 0 ? (
            expanded ? <ChevronDown size={16} color="#6366f1" /> : <ChevronRight size={16} color="#888" />
          ) : null}
        </div>
        
        {expanded ? <FolderOpen size={16} color="#6366f1" /> : <Folder size={16} color={isSelected ? '#818cf8' : '#475569'} />}
        
        <span style={{ fontWeight: isSelected ? 600 : (level === 0 ? 500 : 400), fontSize: '0.9rem' }}>{node.name}</span>
        
        {loading && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>...</span>}
      </div>

      {expanded && children.length > 0 && (
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: '0.75rem', paddingLeft: '0.25rem' }}>
          {children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} selectedCat={selectedCat} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export function NovtraSync() {
  const [products, setProducts] = useState<NovtraProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Category state
  const [roots, setRoots] = useState<CategoryNode[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 1000;
  
  // Initial startup: fetch categories only
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/amazon-categories`)
      .then(r => r.json())
      .then(data => {
        setRoots(data.data || []);
      })
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  const loadProducts = async (cat: string | null, pageNum: number, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    
    try {
      let query = `/novtra/products?page=${pageNum}&limit=${LIMIT}`;
      if (cat && cat !== 'All Products') {
        query += `&category=${encodeURIComponent(cat)}`;
      }
      
      const data = await api.get(query);
      const fetchedProducts = data.our_products || [];
      
      if (append) {
        setProducts(prev => [...prev, ...fetchedProducts]);
      } else {
        setProducts(fetchedProducts);
      }
      
      setHasMore(fetchedProducts.length === LIMIT);
      setInitialLoadDone(true);
    } catch (err) {
      console.error('Error fetching novtra products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // If a user clicks a category (or 'All Products'), reset page and load
    if (selectedCat !== null || initialLoadDone) {
      setPage(1);
      loadProducts(selectedCat, 1, false);
    }
  }, [selectedCat]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProducts(selectedCat, nextPage, true);
  };

  const renderCard = (p: NovtraProduct) => {
    // Format money
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    
    return (
      <div 
        key={p.id} 
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Source Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: '#4f46e5',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 10
        }}>
          OUR AD
        </div>

        {/* Thumbnail */}
        <div style={{ height: '180px', width: '100%', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
          {p.thumbnail_url ? (
            <img 
              src={p.thumbnail_url} 
              alt={p.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 0.85rem;">No Image</div>';
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No Image
            </div>
          )}
        </div>

        {/* Card Body */}
        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Winner Badge */}
          {p.is_winner && (
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              padding: '0.2rem 0.6rem', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: '#34d399', 
              borderRadius: '999px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              alignSelf: 'flex-start'
            }}>
              🏆 Winning Product
            </div>
          )}

          {/* Title */}
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.title}
          </h3>

          <div style={{ flex: 1 }}></div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            {p.total_profit !== undefined && p.total_profit !== null && p.total_profit > 0 ? (
              <>
                <div style={{ color: '#94a3b8' }}>Total Profit</div>
                <div style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>{formatter.format(p.total_profit)}</div>
                
                <div style={{ color: '#94a3b8' }}>ROAS</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{p.roas || 'N/A'}</div>
                
                <div style={{ color: '#94a3b8' }}>Avg CPC</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{p.avg_cpc ? `$${parseFloat(p.avg_cpc).toFixed(2)}` : 'N/A'}</div>
              </>
            ) : (
              <>
                <div style={{ color: '#94a3b8' }}>Total EU Reach</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{p.eu_reach || 'N/A'}</div>
                
                <div style={{ color: '#94a3b8' }}>Ad Type</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{p.ad_type || 'N/A'}</div>
              </>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0' }} />

          {/* Actions / Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: p.is_active !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.is_active !== false ? '#34d399' : '#f87171', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.is_active !== false ? '#34d399' : '#f87171' }}></div>
              {p.is_active !== false ? 'Active Ad' : 'Inactive'}
            </span>

            <a 
              href={`https://api.novtra.lt:5000/api/AllProducts/products/${p.id}`} // Mocked URL since Novtra is an API
              target="_blank" 
              rel="noreferrer"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                color: '#94a3b8', 
                textDecoration: 'none', 
                fontSize: '0.85rem', 
                fontWeight: 500,
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <ExternalLink size={14} /> View Ad
            </a>
          </div>
          
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1.5rem', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* LEFT SIDEBAR: CATEGORIES */}
      <div style={{ width: '280px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderOpen size={20} color="#6366f1" />
          Categories
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.5rem' }}>
          {/* All Products Option */}
          <div 
            onClick={() => setSelectedCat('All Products')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.6rem 1rem', 
              borderRadius: '6px',
              background: selectedCat === 'All Products' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              cursor: 'pointer',
              color: selectedCat === 'All Products' ? '#818cf8' : '#e2e8f0',
              fontWeight: selectedCat === 'All Products' ? 600 : 500,
              borderLeft: selectedCat === 'All Products' ? '3px solid #6366f1' : '3px solid transparent',
              marginBottom: '1rem'
            }}
          >
            <Inbox size={18} color={selectedCat === 'All Products' ? "#818cf8" : "#94a3b8"} />
            All Products
          </div>

          <div style={{ padding: '0 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Amazon Categories
          </div>
          
          {roots.length === 0 ? (
            <div style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Loading categories...</div>
          ) : (
            roots.map(root => (
              <TreeNode key={root.id} node={root} selectedCat={selectedCat} onSelect={setSelectedCat} />
            ))
          )}
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
        
        {/* Header Title */}
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 700 }}>
            {selectedCat && selectedCat !== 'All Products' ? selectedCat.split(' > ').pop() : (selectedCat === 'All Products' ? 'All Products' : 'Novtra Sync')}
          </h1>
          {selectedCat && (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
              {selectedCat === 'All Products' ? 'Showing all products from Novtra API.' : `Showing products within ${selectedCat}.`}
            </p>
          )}
        </div>

        {/* Header Legend */}
        {selectedCat && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '1rem 1.5rem', 
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginRight: '0.5rem' }}>Color Legend:</span>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'rgba(79, 70, 229, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#818cf8', border: '1px solid rgba(79, 70, 229, 0.3)'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }}></div>
              Our Advertised
            </div>

            {/* In the future, competitors will be here */}
            {/* <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></div>
              Competitors
            </div> */}
          </div>
        )}

        {/* Data Grid / Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {!selectedCat ? (
            <div style={{ 
              height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', borderStyle: 'dashed'
            }}>
              <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
              <h2 style={{ color: '#e2e8f0', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Welcome to Novtra Sync</h2>
              <p style={{ margin: 0 }}>Select a category from the sidebar to view products, or click 'All Products'.</p>
            </div>
          ) : loading && products.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
              <div className="spinner" style={{ 
                width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' 
              }}></div>
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Inbox size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <p>No products found for this category.</p>
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1.5rem',
                paddingBottom: '2rem'
              }}>
                {products.map(renderCard)}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 3rem 0' }}>
                  <button 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      padding: '0.8rem 2rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if(!loadingMore) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                    onMouseLeave={e => { if(!loadingMore) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  >
                    {loadingMore ? (
                      <>
                        <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        Loading...
                      </>
                    ) : 'Load More Products'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
      </div>
      
    </div>
  );
}
