import { useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { AdCard } from './components/AdCard';
import { usePages } from './hooks/usePages';
import { useCountries } from './hooks/useCountries';
import { LayoutGrid } from 'lucide-react';
import { AddSearchTerm } from './components/AddSearchTerm';

import './App.css';

function App() {
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReach, setFilterReach] = useState(false);
  const [page, setPage] = useState(0);

  const { countries } = useCountries();

  // Pass filters to hook
  const { pages, loading, error, hasMore } = usePages(
    { country: selectedCountry, searchTerm },
    page
  );

  // Reset page when filters change
  const handleCountryChange = (c: string) => {
    setSelectedCountry(c);
    setPage(0);
  };

  const handleSearchChange = (s: string) => {
    setSearchTerm(s);
    setPage(0);
  };

  if (loading && page === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f0f10] text-white">
        <div className="animate-pulse flex flex-col items-center">
          <LayoutGrid className="w-12 h-12 mb-4 animate-spin" />
          <p>Loading Pages from Supabase...</p>
        </div>
      </div>
    );
  }

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

      <FilterBar
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        onReachChange={setFilterReach}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        availableCountries={countries}
      />

      <main className="main-content">
        <div className="ads-grid">
          {filteredPages.map((page) => (
            <AdCard
              key={page.page_id}
              pageName={page.name}
              beneficiary={page.beneficiary}
              totalReach={page.total_eu_reach}
              mediaUrl={page.top_creative?.media_url}
              mediaType={page.top_creative?.media_type}
              snapshotUrl={page.top_creative?.snapshot_url}
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
                color: '#333', // Explicit dark text color
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
      </main>
    </div>
  );
}

export default App;
