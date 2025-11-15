/**
 * Home Page - Main Popup Interface (Frontend Step 6)
 * Event input, LLM parsing, conflict checking
 */

import React, { useState } from 'react';
import { AuthUser } from '../utils/auth';
import EventInputForm from '../components/EventInputForm';
import ConflictModal from '../components/ConflictModal';
import { Conflict, ParsedEvent } from '../types';
import '../styles/Home.css';

interface HomeProps {
  user: AuthUser | null;
  authenticated: boolean;
  onLoginSuccess: (user: AuthUser) => void;
}

const Home: React.FC<HomeProps> = ({ user, authenticated, onLoginSuccess }) => {
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [newEvent, setNewEvent] = useState<ParsedEvent | null>(null);

  const handleConflictsDetected = (
    detectedConflicts: Conflict[],
    event: ParsedEvent
  ) => {
    setConflicts(detectedConflicts);
    setNewEvent(event);
    setShowConflictModal(true);
  };

  const handleConflictResolved = () => {
    setShowConflictModal(false);
    setConflicts([]);
    setNewEvent(null);
  };

  if (!authenticated || !user) {
    return (
      <div className="home-container">
        <div className="welcome-section">
          <h1>Welcome to Solis</h1>
          <p>Your AI-powered calendar scheduling assistant</p>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <span>Natural language event creation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>Smart conflict detection</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📅</span>
              <span>Intelligent rescheduling</span>
            </div>
          </div>
          <p className="connect-prompt">
            Connect your Google Calendar in Settings to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <EventInputForm
        user={user}
        onConflictsDetected={handleConflictsDetected}
      />
      
      {showConflictModal && conflicts.length > 0 && newEvent && (
        <ConflictModal
          conflicts={conflicts}
          newEvent={newEvent}
          user={user}
          onClose={() => setShowConflictModal(false)}
          onResolved={handleConflictResolved}
        />
      )}
    </div>
  );
};

export default Home;

