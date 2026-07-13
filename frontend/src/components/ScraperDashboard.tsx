import { useState, useEffect, useRef } from 'react'
import { Terminal, RefreshCw, Play, Search, Archive, CheckCircle, XCircle, Square } from 'lucide-react'

const API_BASE = import.meta.env.VITE_1688_API_URL || 'http://127.0.0.1:8000/api'

interface JobStatus {
  id: string
  job_type: string
  status: 'running' | 'done' | 'error' | 'cancelled'
  logs: string[]
  products_found: number
  shops_found: number
  category_stats?: Record<string, number>
  started_at: string
  completed_at?: string
  error_message?: string
}

export function ScraperDashboard() {
  const [activeJobId, setActiveJobId] = useState<string | null>(() => localStorage.getItem('active_scraper_job'))
  const [jobState, setJobState] = useState<JobStatus | null>(null)
  const [jobHistory, setJobHistory] = useState<JobStatus[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [startPage, setStartPage] = useState("1")
  const [endPage, setEndPage] = useState("2")
  
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Fetch history on mount
  useEffect(() => {
    fetchHistory()
  }, [])

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return

    let interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${activeJobId}`)
        if (res.ok) {
          const data = await res.json()
          setJobState(data)
          if (data.status !== 'running') {
            clearInterval(interval)
            setActiveJobId(null)
            localStorage.removeItem('active_scraper_job')
            fetchHistory() // refresh history
          }
        }
      } catch (err) {
        console.error("Error polling job", err)
      }
    }, 10000) // Poll every 10 seconds

    // Initial fetch immediately
    fetch(`${API_BASE}/jobs/${activeJobId}`).then(r => r.json()).then(setJobState).catch(console.error)

    return () => clearInterval(interval)
  }, [activeJobId])

  // Auto-scroll logs — only inside the log container, not the whole page
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [jobState?.logs])

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`${API_BASE}/jobs`)
      if (res.ok) {
        const data = await res.json()
        setJobHistory(data.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const startJob = async (type: 'find-new-shops' | 'check-new-products' | 'manual-deduplication') => {
    if (activeJobId) return // wait for current to finish
    try {
      let body = undefined;
      let headers = undefined;

      if (type === 'find-new-shops') {
        const sp = parseInt(startPage) || 1;
        const ep = parseInt(endPage) || 1;
        if (sp < 1 || ep < 1) {
          alert("Page numbers must be 1 or greater.");
          return;
        }
        if (ep < sp) {
          alert("End Page must be greater than or equal to Start Page.");
          return;
        }
        body = JSON.stringify({ start_page: sp, end_page: ep });
        headers = { 'Content-Type': 'application/json' };
      }
      
      const res = await fetch(`${API_BASE}/jobs/${type}`, { 
        method: 'POST',
        headers,
        body
      })
      if (res.ok) {
        const data = await res.json()
        setActiveJobId(data.job_id)
        localStorage.setItem('active_scraper_job', data.job_id)
        setJobState({
          id: data.job_id,
          job_type: type,
          status: 'running',
          logs: ['Starting job...'],
          products_found: 0,
          shops_found: 0,
          started_at: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error(err)
      alert("Error starting job")
    }
  }

  const stopJob = async () => {
    if (!activeJobId) return
    try {
      const res = await fetch(`${API_BASE}/jobs/${activeJobId}/cancel`, { method: 'POST' })
      if (res.ok) {
        setJobState(prev => prev ? { ...prev, logs: [...prev.logs, "⚠️ Requesting stop..."] } : null)
      }
    } catch (err) {
      console.error(err)
      alert("Error stopping job")
    }
  }

  const btnStyle = (bg: string, color: string) => ({
    padding: '0.8rem 1.5rem',
    borderRadius: '8px',
    border: `1px solid ${color}`,
    background: bg,
    color: color,
    cursor: activeJobId ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    fontSize: '1rem',
    opacity: activeJobId ? 0.5 : 1,
    transition: 'all 0.2s'
  })

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
          <Terminal size={24} color="#6366f1" />
          Scraper Control Dashboard
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Manage automated scraping tasks. "Find New Shops" extracts shops from categories and their top products. "Check New Products" audits your currently tracked shops.
        </p>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(99,102,241,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>Start Page:</span>
            <input 
              type="number" 
              min="1" 
              value={startPage} 
              onChange={e => setStartPage(e.target.value)}
              style={{ width: '60px', background: '#1e1e2d', border: '1px solid #333', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#a5b4fc', marginLeft: '0.5rem' }}>End Page:</span>
            <input 
              type="number" 
              min="1" 
              value={endPage} 
              onChange={e => setEndPage(e.target.value)}
              style={{ width: '60px', background: '#1e1e2d', border: '1px solid #333', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
            />
          </div>
          <button 
            onClick={() => startJob('find-new-shops')}
            disabled={!!activeJobId}
            style={btnStyle('rgba(99,102,241,0.15)', '#818cf8')}>
            <Search size={18} />
            Find New Shops
          </button>
        </div>
        
        <button 
          onClick={() => startJob('check-new-products')}
          disabled={!!activeJobId}
          style={btnStyle('rgba(34,197,94,0.15)', '#4ade80')}>
          <Play size={18} />
          Check New Products
        </button>
        
        <button 
          onClick={() => startJob('manual-deduplication')}
          disabled={!!activeJobId}
          style={btnStyle('rgba(239, 68, 68, 0.15)', '#ef4444')}
          title="Manually clean duplicates from pending discoveries">
          <RefreshCw size={18} />
          Clean Duplicates
        </button>
      </div>

      {/* Active Job Terminal */}
      {jobState && (
        <div style={{ background: '#0a0a0f', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
          <div style={{ background: '#1a1a24', padding: '0.75rem 1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#fff' }}>
              {jobState.status === 'running' ? (
                <RefreshCw size={14} className="animate-spin" color="#6366f1" />
              ) : jobState.status === 'done' ? (
                <CheckCircle size={14} color="#22c55e" />
              ) : jobState.status === 'cancelled' ? (
                <XCircle size={14} color="#f59e0b" />
              ) : (
                <XCircle size={14} color="#ef4444" />
              )}
              <strong style={{ textTransform: 'capitalize' }}>{jobState.job_type?.replace(/_/g, ' ') || 'Unknown Job'}</strong>
              <span style={{ color: '#888' }}>({jobState.status})</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#a5b4fc' }}>
                {jobState.shops_found > 0 && <span>+{jobState.shops_found} Shops</span>}
                <span>+{jobState.products_found} Products</span>
              </div>
              {jobState.status === 'running' && (
                <button 
                  onClick={stopJob}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <Square size={12} fill="#ef4444" /> Stop
                </button>
              )}
            </div>
          </div>
          <div ref={logsContainerRef} style={{ padding: '1rem', height: '350px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', color: '#a0a0b0', lineHeight: '1.6' }}>
            {jobState.logs?.length === 0 ? (
              <span style={{ opacity: 0.5 }}>Waiting for logs... (updates every 10s)</span>
            ) : (
              jobState.logs?.map((line, i) => {
                let color = '#a0a0b0'
                if (line.includes('ERROR') || line.includes('❌')) color = '#fca5a5'
                if (line.includes('✓') || line.includes('✅') || line.includes('éxito')) color = '#86efac'
                if (line.includes('¡') || line.includes('descubiertas')) color = '#fde047'
                
                return (
                  <div key={i} style={{ color, marginBottom: '4px' }}>
                    {line}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
          <Archive size={18} />
          Recent Jobs History
        </h3>
        {loadingHistory ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading history...</div>
        ) : jobHistory.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: '#888' }}>
            No jobs found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {jobHistory.map((job) => (
              <div key={job.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {job.status === 'running' ? <RefreshCw size={16} className="animate-spin" color="#6366f1" /> :
                     job.status === 'done' ? <CheckCircle size={16} color="#22c55e" /> :
                     job.status === 'cancelled' ? <XCircle size={16} color="#f59e0b" /> :
                     <XCircle size={16} color="#ef4444" />}
                    <div>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.95rem' }}>{job.job_type?.replace(/_/g, ' ') || 'Unknown Job'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Started: {new Date(job.started_at).toLocaleString('en-GB', { timeZone: 'Europe/Vilnius', dateStyle: 'short', timeStyle: 'medium' })} (LT)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <div style={{ color: '#a5b4fc' }}><strong>{job.shops_found}</strong> shops</div>
                    <div style={{ color: '#86efac' }}><strong>{job.products_found}</strong> products</div>
                    <div style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#888' }}>
                      {job.status}
                    </div>
                  </div>
                </div>
                
                {/* Category Breakdown (if any) */}
                {job.category_stats && Object.keys(job.category_stats).length > 0 && (
                  <div style={{ padding: '0.5rem 1rem 1rem 1rem', background: 'var(--bg-card)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', border: '1px solid var(--border-color)', borderTop: 'none', marginTop: '-0.5rem', fontSize: '0.85rem', color: '#a0a0b0', display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <div style={{ width: '100%', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '2px' }}>Shops by Category:</div>
                    {Object.entries(job.category_stats).map(([cat, count]) => (
                      <div key={cat} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', padding: '2px 8px', borderRadius: '12px', color: '#c7d2fe' }}>
                        {cat}: <strong>{count as React.ReactNode}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
