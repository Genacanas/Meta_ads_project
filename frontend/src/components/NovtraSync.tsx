import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ExternalLink, Search, RefreshCw, BarChart2, Inbox } from 'lucide-react';

interface NovtraProduct {
  id: number;
  title: string;
  body: string;
  amazon_category: string;
  similarity_score: number;
  source?: string;
  active?: boolean;
  reach?: string;
  adType?: string;
}

interface SyncStats {
  total_in_novtra: number;
  synced: number;
  remaining: number;
  avg_precision: number;
  competitors_tracked: number;
}

export function NovtraSync() {
  const [products, setProducts] = useState<NovtraProduct[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/novtra/products');
      // Mix our products and mock competitors for the UI
      const mixed = [...(data.our_products || []), ...(data.competitors || [])];
      setProducts(mixed);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching novtra products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSyncBatch = async () => {
    // In a real scenario, this would call POST /api/jobs/sync-novtra
    alert('Syncing new batch of products from Novtra API... (This runs in the background)');
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toString().includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', color: '#f8fafc' }}>
      
      {/* Header and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.6rem 1rem 0.6rem 2.5rem', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px',
              color: 'white',
              outline: 'none'
            }} 
          />
        </div>

        <button 
          onClick={handleSyncBatch}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            color: 'white', 
            border: 'none', 
            padding: '0.6rem 1.2rem', 
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}
        >
          <RefreshCw size={18} />
          Sync Batch
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Products in Novtra', value: stats?.total_in_novtra?.toLocaleString() || '...' },
          { label: 'Synced', value: stats?.synced?.toLocaleString() || '...', color: '#34d399' },
          { label: 'Remaining', value: stats?.remaining?.toLocaleString() || '...' },
          { label: 'Cat. Precision', value: stats ? `${stats.avg_precision}%` : '...', color: '#60a5fa' },
          { label: 'Competitors', value: stats?.competitors_tracked?.toString() || '...' },
        ].map((metric, i) => (
          <div key={i} style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            borderRadius: '12px', 
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {metric.label}
            </span>
            <span style={{ fontSize: '1.8rem', fontWeight: 700, color: metric.color || '#f8fafc' }}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1.5fr 1fr 1fr 0.5fr', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div>Global Product</div>
          <div>DB ID</div>
          <div>Amazon Category</div>
          <div>Confidence</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Inbox size={48} style={{ opacity: 0.5 }} />
              <p>No products found.</p>
            </div>
          ) : (
            filteredProducts.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1.5fr 1fr 1fr 0.5fr', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                
                {/* Global Product */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingRight: '1rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.body || p.reach || 'No description available'}</span>
                </div>

                {/* ID */}
                <div style={{ fontFamily: 'monospace', color: '#94a3b8' }}>#{p.id}</div>

                {/* Amazon Category */}
                <div style={{ paddingRight: '1rem' }}>
                  {p.source === 'comp' ? (
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.6rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      Competitor Match
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.6rem', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={p.amazon_category}>
                      {p.amazon_category?.split(' > ').pop() || 'Unknown'}
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div>
                  {p.source === 'comp' ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>N/A</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(p.similarity_score || 0) * 100}%`, height: '100%', background: (p.similarity_score || 0) > 0.8 ? '#34d399' : '#60a5fa', borderRadius: '999px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px' }}>
                        {((p.similarity_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  {p.source === 'comp' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: p.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.active ? '#34d399' : '#f87171', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.active ? '#34d399' : '#f87171' }}></div>
                      {p.active ? 'Active Ad' : 'Inactive'}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></div>
                      Processed
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ textAlign: 'right' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'}} onMouseLeave={e => {e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'}} title="View in Novtra">
                    <ExternalLink size={18} />
                  </button>
                </div>
                
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
