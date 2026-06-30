import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DataHub1688 } from './components/DataHub1688';
import { ShopReview } from './components/ShopReview';

import './App.css';

function App() {
  const { isAuthenticated } = useAuth();

  const [currentView, setCurrentView] = useState<'products' | 'shops'>('products');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <nav style={{ padding: '0.75rem 1.5rem', background: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', color: 'white', alignItems: 'center' }}>
        <h3 style={{ margin: 0, marginRight: '1rem', fontWeight: 600, color: '#e2e8f0' }}>Portal Empresarial</h3>
        
        <button 
          onClick={() => setCurrentView('products')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: currentView === 'products' ? '#6366f1' : 'transparent', 
            border: currentView === 'products' ? 'none' : '1px solid rgba(255,255,255,0.2)', 
            color: 'white', 
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          1688 Data Hub
        </button>

        <button 
          onClick={() => setCurrentView('shops')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: currentView === 'shops' ? '#6366f1' : 'transparent', 
            border: currentView === 'shops' ? 'none' : '1px solid rgba(255,255,255,0.2)', 
            color: 'white', 
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Shop Review
        </button>
      </nav>
      <div style={{ flex: 1, overflow: 'auto', background: '#0a0a0f' }}>
        {currentView === 'products' ? <DataHub1688 /> : <ShopReview />}
      </div>
    </div>
  );
}

export default App;
