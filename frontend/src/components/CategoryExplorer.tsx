import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Database } from 'lucide-react'

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : 'https://backend1688-production.up.railway.app/api';

interface CategoryNode {
  id: string
  name: string
  searchIndex: string
  childCount: number
}

const TreeNode = ({ node, level = 0 }: { node: CategoryNode, level?: number }) => {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!node.childCount) return

    if (!expanded && children.length === 0) {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/amazon-categories?parent_id=${node.id}`)
        if (res.ok) {
          const data = await res.json()
          setChildren(data.data || [])
        }
      } catch (err) {
        console.error("Error fetching children", err)
      } finally {
        setLoading(false)
      }
    }
    setExpanded(!expanded)
  }

  return (
    <div style={{ marginLeft: level === 0 ? '0' : '1.5rem', marginTop: '0.25rem' }}>
      <div 
        onClick={handleToggle}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem', 
          borderRadius: '6px',
          background: expanded ? 'rgba(255,255,255,0.05)' : 'transparent',
          cursor: node.childCount > 0 ? 'pointer' : 'default',
          color: node.childCount > 0 ? '#e2e8f0' : '#94a3b8',
          userSelect: 'none',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          if (node.childCount > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = expanded ? 'rgba(255,255,255,0.05)' : 'transparent'
        }}
      >
        {/* Expand Icon */}
        <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {node.childCount > 0 ? (
            expanded ? <ChevronDown size={16} color="#6366f1" /> : <ChevronRight size={16} color="#888" />
          ) : null}
        </div>
        
        {/* Folder Icon */}
        {expanded ? <FolderOpen size={16} color="#6366f1" /> : <Folder size={16} color={node.childCount > 0 ? '#94a3b8' : '#475569'} />}
        
        <span style={{ fontWeight: level === 0 ? 600 : 400 }}>{node.name}</span>
        
        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#a0a0b0', marginLeft: '0.5rem' }}>
          ID: {node.id}
        </span>
        
        {loading && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>Loading...</span>}
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '0.5rem', paddingLeft: '0.5rem' }}>
          {children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryExplorer() {
  const [roots, setRoots] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/amazon-categories`)
      .then(r => r.json())
      .then(data => {
        setRoots(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
          <Database size={24} color="#6366f1" />
          Amazon Categories Explorer
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Browse the complete Amazon US category tree. Click on a category to lazy-load and expand its subcategories.
        </p>
      </div>

      {/* Tree Container */}
      <div style={{ flex: 1, background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Loading root categories...</div>
        ) : roots.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No categories found. Check backend connection.</div>
        ) : (
          <div>
            {roots.map(root => (
              <TreeNode key={root.id} node={root} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
