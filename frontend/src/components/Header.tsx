/**
 * Header Component (Frontend Step 4)
 * Navigation tabs, user profile, logout functionality
 */

import React from 'react';
import { AuthUser } from '../utils/auth';
import '../styles/Header.css';

interface HeaderProps {
  activeTab: 'home' | 'settings';
  onTabChange: (tab: 'home' | 'settings') => void;
  user: AuthUser | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogout,
}) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">☀️</span>
            <span className="logo-text">Solis</span>
          </div>
          
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => onTabChange('home')}
            >
              <span className="tab-icon">🏠</span>
              <span className="tab-text">Home</span>
            </button>
            
            <button
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => onTabChange('settings')}
            >
              <span className="tab-icon">⚙️</span>
              <span className="tab-text">Settings</span>
            </button>
          </nav>
        </div>
        
        <div className="header-right">
          {user ? (
            <div className="user-section">
              <div className="user-profile">
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
              
              <button className="logout-button" onClick={onLogout}>
                <span className="logout-icon">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="connection-status disconnected">
              <span className="status-indicator"></span>
              <span>Not Connected</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

