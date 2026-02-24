import { useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { AdCard } from './components/AdCard';
import { usePages } from './hooks/usePages';
import { useCountries } from './hooks/useCountries';
import { LayoutGrid } from 'lucide-react';
import { AddSearchTerm } from './components/AddSearchTerm';
import { api } from './lib/api';

import './App.css';

function App() {
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All'); // New state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReach, setFilterReach] = useState(false);
  const [activeTab, setActiveTab] = useState<'unprocessed' | 'saved' | 'deleted'>('unprocessed');
  const [page, setPage] = useState(0);

  const { countries } = useCountries();

  // Pass filters to hook
  const { pages, setPages, loading, error, hasMore } = usePages(
    { country: selectedCountry, category: selectedCategory, searchTerm, status: activeTab },
    page
  );

  // Reset page when filters change
  const handleCountryChange = (c: string) => {
    setSelectedCountry(c);
    setPage(0);
  };

  const handleCategoryChange = (c: string) => {
    setSelectedCategory(c);
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

  const handleStatusChange = async (pageId: string, status: 'saved' | 'deleted' | 'unprocessed') => {
    try {
      await api.patch(`/pages/${pageId}/status`, { manual_status: status });

      // Optimistically remove from current view if it's no longer the active tab
      if (status !== activeTab) {
        setPages((prev: any[]) => prev.filter((p: any) => p.page_id !== pageId));
      }
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status");
    }
  };

  // We removed the full-screen loading early return.

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f0f10] text-red-500">
        Error: {error}
      </div>
    );
  }

  const filteredPages = pages.filter(page => {
    // Client-side filtering for reach (optional, as we might want to do this in DB too later)
    if (filterReach && page.total_eu_reach < 900000) return false;
    return true;
  });

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Ad Library Analysis</h1>
        <AddSearchTerm onTermAdded={() => window.location.reload()} />
      </header>

      {/* Tabs UI */}
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
        onReachChange={setFilterReach}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        availableCountries={countries}
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
              {filteredPages.map((page) => (
                <AdCard
                  key={page.page_id}
                  pageId={page.page_id}
                  pageName={page.name}
                  beneficiary={page.beneficiary}
                  totalReach={page.total_eu_reach}
                  mediaUrl={page.top_creative?.media_url}
                  mediaType={page.top_creative?.media_type}
                  snapshotUrl={page.top_creative?.snapshot_url}
                  onStatusChange={handleStatusChange}
                  currentTab={activeTab}
                />
              ))}
            </div>

            {hasMore && filteredPages.length > 0 && (
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

            {!loading && filteredPages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: '#666' }}>
                <p>No pages found for this status/filter combination.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
