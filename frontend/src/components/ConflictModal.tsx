/**
 * Conflict Detection Modal (Frontend Step 7)
 * Shows conflicting events and resolution options
 */

import React, { useState } from 'react';
import { AuthUser } from '../utils/auth';
import { Conflict, ParsedEvent } from '../types';
import RescheduleSolo from './RescheduleSolo';
import RescheduleMulti from './RescheduleMulti';
import API from '../utils/api';
import '../styles/ConflictModal.css';

interface ConflictModalProps {
  conflicts: Conflict[];
  newEvent: ParsedEvent;
  user: AuthUser;
  onClose: () => void;
  onResolved: () => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  conflicts,
  newEvent,
  user,
  onClose,
  onResolved,
}) => {
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [loading, setLoading] = useState(false);

  const primaryConflict = conflicts[0];
  const hasMultipleConflicts = conflicts.length > 1;

  const handleMoveExisting = () => {
    setSelectedConflict(primaryConflict);
    setShowReschedule(true);
  };

  const handleKeepCurrent = async () => {
    setLoading(true);
    try {
      // Force create event despite conflicts
      await API.events.create(user.email, newEvent, true);
      onResolved();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showReschedule && selectedConflict) {
    const hasAttendees = selectedConflict.existingEventHasAttendees;
    
    return hasAttendees ? (
      <RescheduleMulti
        event={selectedConflict.conflictingEvent}
        user={user}
        reason="Conflict with new event"
        onClose={() => setShowReschedule(false)}
        onSuccess={onResolved}
      />
    ) : (
      <RescheduleSolo
        event={selectedConflict.conflictingEvent}
        user={user}
        onClose={() => setShowReschedule(false)}
        onSuccess={onResolved}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚠️ Schedule Conflict Detected</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <p className="conflict-message">
            Your new event conflicts with {conflicts.length} existing event{conflicts.length > 1 ? 's' : ''}.
          </p>

          <div className="events-comparison">
            <div className="event-card new-event">
              <div className="event-card-header">
                <span className="event-label">New Event</span>
                <span className={`priority-badge priority-${newEvent.priority}`}>
                  Priority {newEvent.priority}
                </span>
              </div>
              <h3>{newEvent.title}</h3>
              <div className="event-time">
                <span className="icon">🕐</span>
                {new Date(newEvent.startDateTime).toLocaleString()} - 
                {new Date(newEvent.endDateTime).toLocaleTimeString()}
              </div>
              <div className="event-meta">
                <span className={`flexibility-badge ${newEvent.flexibility.toLowerCase()}`}>
                  {newEvent.flexibility}
                </span>
                <span className="category-badge">{newEvent.category}</span>
              </div>
            </div>

            <div className="conflict-arrow">↔️</div>

            <div className="event-card existing-event">
              <div className="event-card-header">
                <span className="event-label">Existing Event</span>
                <span className={`priority-badge priority-${primaryConflict.conflictingEvent.Event_Priority}`}>
                  Priority {primaryConflict.conflictingEvent.Event_Priority}
                </span>
              </div>
              <h3>{primaryConflict.conflictingEvent.Event_Name}</h3>
              <div className="event-time">
                <span className="icon">🕐</span>
                {new Date(primaryConflict.conflictingEvent.Event_Start_Date).toLocaleString()} - 
                {new Date(primaryConflict.conflictingEvent.Event_End_Date).toLocaleTimeString()}
              </div>
              <div className="event-meta">
                <span className={`flexibility-badge ${primaryConflict.conflictingEvent.Event_Flexibility.toLowerCase()}`}>
                  {primaryConflict.conflictingEvent.Event_Flexibility}
                </span>
                {primaryConflict.existingEventHasAttendees && (
                  <span className="attendees-badge">
                    <span className="icon">👥</span>
                    {primaryConflict.conflictingEvent.Event_Guests.length} attendees
                  </span>
                )}
              </div>
            </div>
          </div>

          {primaryConflict.recommendation && (
            <div className="recommendation-box">
              <h4>💡 Recommendation</h4>
              <p><strong>{primaryConflict.recommendation.reason}</strong></p>
              <p className="recommendation-action">
                Suggested action: {
                  primaryConflict.recommendation.action === 'move_existing'
                    ? 'Reschedule the existing event'
                    : primaryConflict.recommendation.action === 'move_new'
                    ? 'Choose a different time for the new event'
                    : 'Manual decision required'
                }
              </p>
            </div>
          )}

          {hasMultipleConflicts && (
            <div className="additional-conflicts">
              <p>⚠️ {conflicts.length - 1} additional conflict{conflicts.length > 2 ? 's' : ''} detected</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="action-button secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          
          {primaryConflict.existingEventCanMove && (
            <button
              className="action-button primary"
              onClick={handleMoveExisting}
              disabled={loading}
            >
              Reschedule Existing Event
            </button>
          )}
          
          <button
            className="action-button warning"
            onClick={handleKeepCurrent}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Keep Both (Override)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;

