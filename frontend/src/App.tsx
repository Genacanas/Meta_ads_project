import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { DataHub1688 } from './components/DataHub1688';

import './App.css';

function App() {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<'ads' | '1688'>('ads');

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <nav style={{ padding: '0.75rem 1.5rem', background: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', color: 'white', alignItems: 'center' }}>
        <h3 style={{ margin: 0, marginRight: '1rem', fontWeight: 600, color: '#e2e8f0' }}>Portal Empresarial</h3>
        <button 
          onClick={() => setCurrentView('ads')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: currentView === 'ads' ? '#3b82f6' : 'transparent', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer', 
            borderRadius: '6px',
            fontWeight: currentView === 'ads' ? 600 : 400
          }}
        >
          Análisis de Anuncios
        </button>
        <button 
          onClick={() => setCurrentView('1688')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: currentView === '1688' ? '#6366f1' : 'transparent', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer', 
            borderRadius: '6px',
            fontWeight: currentView === '1688' ? 600 : 400
          }}
        >
          1688 Data Hub
        </button>
      </nav>
      <div style={{ flex: 1, overflow: 'auto', background: currentView === '1688' ? '#0a0a0f' : 'inherit' }}>
        {currentView === 'ads' ? <Dashboard /> : <DataHub1688 />}
      </div>
    </div>
  );
}

export default App;
