import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { DataHub1688 } from './components/DataHub1688';

import './App.css';

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <nav style={{ padding: '0.75rem 1.5rem', background: '#0a0a0f', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', color: 'white', alignItems: 'center' }}>
        <h3 style={{ margin: 0, marginRight: '1rem', fontWeight: 600, color: '#e2e8f0' }}>Portal Empresarial</h3>
        {/* Componente viejo oculto:
        <button 
          ...
        >
          Análisis de Anuncios
        </button> */}
        
        <div 
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#6366f1', 
            border: 'none', 
            color: 'white', 
            borderRadius: '6px',
            fontWeight: 600
          }}
        >
          1688 Data Hub
        </div>
      </nav>
      <div style={{ flex: 1, overflow: 'auto', background: '#0a0a0f' }}>
        <DataHub1688 />
        {/* <Dashboard /> oculto para evitar peticiones al backend viejo */}
      </div>
    </div>
  );
}

export default App;
