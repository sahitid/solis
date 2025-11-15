import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Header from './components/Header';
import Home from './pages/Home';
import SettingsPage from './pages/SettingsPage';
import { getCurrentUser, isAuthenticated } from './utils/auth';
import { AuthUser } from './utils/auth';

type TabType = 'home' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);
      
      if (isAuth) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setAuthenticated(false);
    setActiveTab('home');
    await checkAuth();
  };

  const handleLoginSuccess = (userData: AuthUser) => {
    setUser(userData);
    setAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      
      <div className="app-content">
        {activeTab === 'home' && (
          <Home
            user={user}
            authenticated={authenticated}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPage
            user={user}
            authenticated={authenticated}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default App;

