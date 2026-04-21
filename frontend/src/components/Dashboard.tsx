import { useState, useMemo } from 'react';
import { FilterBar } from './FilterBar';
import { AdCard } from './AdCard';
import { usePages } from '../hooks/usePages';
import { useCountries } from '../hooks/useCountries';
import { useTags } from '../hooks/useTags';
import { LayoutGrid, LogOut, Trash2, Tag as TagIcon } from 'lucide-react';
import { AddSearchTerm } from './AddSearchTerm';
import { TagManagerModal } from './TagManagerModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReach, setFilterReach] = useState(false);
  const [activeTab, setActiveTab] = useState<'unprocessed' | 'saved' | 'deleted'>('unprocessed');
  const [page, setPage] = useState(0);
  const [actionDate, setActionDate] = useState('');
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  const { logout } = useAuth();

  const { countries } = useCountries();
  const { tags } = useTags();

  const memoizedFilters = useMemo(() => ({
    country: selectedCountry,
    category: selectedCategory,
    tag: selectedTag,
    searchTerm,
    status: activeTab,
    minReach: filterReach ? 900000 : 200000,
    actionDate
  }), [selectedCountry, selectedCategory, selectedTag, searchTerm, activeTab, filterReach, actionDate]);

  const { pages, setPages, loading, error, hasMore } = usePages(
    memoizedFilters,
    page
  );

  const handleCountryChange = (c: string) => {
    setSelectedCountry(c);
    setPage(0);
  };

  const handleCategoryChange = (c: string) => {
    setSelectedCategory(c);
    setPage(0);
  };

  const handleTagChange = (t: string) => {
    setSelectedTag(t);
    setPage(0);
  };

  const handleSearchChange = (s: string) => {
    setSearchTerm(s);
    setPage(0);
  };

  const handleTabChange = (tab: 'unprocessed' | 'saved' | 'deleted') => {
    setActiveTab(tab);
    setPage(0);
  };

  const handleActionDateChange = (date: string) => {
    setActionDate(date);
    setPage(0);
  };

  const handleStatusChange = async (pageId: string, status: 'saved' | 'deleted' | 'unprocessed') => {
    const previousPages = [...pages];
    if (status !== activeTab) {
      setPages((prev: any[]) => prev.filter((p: any) => p.page_id !== pageId));
    }

    try {
      await api.patch(`/pages/${pageId}/status`, { manual_status: status });
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status. Reverting changes.");
      setPages(previousPages);
    }
  };

  const handleTagUpdate = (pageId: string, newTagId: number | null, newTagName: string | null) => {
    setPages((prev: any[]) => prev.map((p: any) => {
      if (p.page_id === pageId) {
        return { ...p, tagId: newTagId, tag: newTagName };
      }
      return p;
    }));
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleClearAllAnalysis = async () => {
    if (!window.confirm("CRITICAL: This will delete ALL ad group analysis for ALL pages. This cannot be undone. Are you sure?")) return;

    try {
      await api.delete('/api/pages/ad-groups/bulk');
      alert("All analyses cleared successfully. Reloading data...");
      window.location.reload();
    } catch (err: any) {
      alert("Failed to clear all analyses: " + (err.message || "Unknown error"));
    }
  };

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f0f10] text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Ad Library Analysis</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AddSearchTerm onTermAdded={() => window.location.reload()} />
          <button
            onClick={() => setIsTagManagerOpen(true)}
            title="Manage and replace tags"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '8px 12px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <TagIcon size={14} />
            Manage Tags
          </button>
          <button
            onClick={handleClearAllAnalysis}
            title="Clear all analyzed groups (Caution!)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '8px 12px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Trash2 size={14} />
            Clear All Analysis
          </button>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '10px', padding: '0 20px', marginBottom: '16px' }}>
        <button
          onClick={() => handleTabChange('unprocessed')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'unprocessed' ? 'bold' : 'normal',
            backgroundColor: activeTab === 'unprocessed' ? '#dbeafe' : '#f3f4f6',
            color: activeTab === 'unprocessed' ? '#1e40af' : '#4b5563',
          }}
        >
          Pending
        </button>
        <button
          onClick={() => handleTabChange('saved')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'saved' ? 'bold' : 'normal',
            backgroundColor: activeTab === 'saved' ? '#dcfce7' : '#f3f4f6',
            color: activeTab === 'saved' ? '#166534' : '#4b5563',
          }}
        >
          Saved
        </button>
        <button
          onClick={() => handleTabChange('deleted')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'deleted' ? 'bold' : 'normal',
            backgroundColor: activeTab === 'deleted' ? '#fee2e2' : '#f3f4f6',
            color: activeTab === 'deleted' ? '#991b1b' : '#4b5563',
          }}
        >
          Deleted
        </button>
      </div>

      <FilterBar
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        selectedTag={selectedTag}
        onTagChange={handleTagChange}
        availableTags={tags}
        onReachChange={setFilterReach}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        availableCountries={countries}
        actionDate={actionDate}
        onActionDateChange={handleActionDateChange}
        filterReach={filterReach}
      />

      <main className="main-content">
        {loading && page === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', color: '#666' }}>
            <LayoutGrid className="w-8 h-8 mb-4 animate-spin" />
            <p>Loading Pages...</p>
          </div>
        ) : (
          <>
            <div className="ads-grid">
              {pages.map((page) => (
                <AdCard
                  key={page.page_id}
                  pageId={page.page_id}
                  pageName={page.name}
                  beneficiary={page.beneficiary}
                  totalReach={page.total_eu_reach}
                  activeReach={page.active_eu_total_reach}
                  activeAdsCount={page.active_ads_count}
                  mediaUrl={page.top_creative?.media_url}
                  mediaType={page.top_creative?.media_type}
                  snapshotUrl={page.top_creative?.snapshot_url}
                  tagId={page.tagId}
                  tagName={page.tag}
                  isQueuedForScrape={page.is_queued_for_scrape}
                  onStatusChange={handleStatusChange}
                  onTagUpdate={handleTagUpdate}
                  currentTab={activeTab}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '1rem',
                    backgroundColor: loading ? '#e0e0e0' : '#f0f0f0',
                    color: '#333',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span> Loading...
                    </>
                  ) : 'Load More'}
                </button>
              </div>
            )}

            {!loading && pages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: '#666' }}>
                <p>No pages found for this status/filter combination.</p>
              </div>
            )}
          </>
        )}
      </main>

      <TagManagerModal 
        isOpen={isTagManagerOpen} 
        onClose={() => setIsTagManagerOpen(false)} 
        onTagsChanged={() => window.location.reload()} 
      />
    </div>
  );
}
