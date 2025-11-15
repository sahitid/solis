/**
 * Event Input Form Component (Part of Step 6)
 * Main input field, LLM parsing, metadata editing
 */

import React, { useState } from 'react';
import { AuthUser } from '../utils/auth';
import API from '../utils/api';
import { ParsedEvent, FlexibilityType, EventType, PriorityLevel, Conflict } from '../types';
import '../styles/EventInputForm.css';

interface EventInputFormProps {
  user: AuthUser;
  onConflictsDetected: (conflicts: Conflict[], event: ParsedEvent) => void;
}

const EventInputForm: React.FC<EventInputFormProps> = ({ user, onConflictsDetected }) => {
  const [input, setInput] = useState('');
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleParse = async () => {
    if (!input.trim()) {
      setError('Please enter an event description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result: any = await API.events.parse(input, user.email);
      
      if (result.success && result.event) {
        setParsedEvent(result.event);
      } else {
        setError('Could not parse event. Please try again.');
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      setError(err.response?.data?.error || 'Failed to parse event');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!parsedEvent) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result: any = await API.events.create(user.email, parsedEvent, false);
      
      if (result.success) {
        setSuccess('Event created successfully!');
        setInput('');
        setParsedEvent(null);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflicts detected
        const conflictData = err.response.data;
        onConflictsDetected(conflictData.conflicts, parsedEvent);
      } else {
        setError(err.response?.data?.error || 'Failed to create event');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateEventField = (field: string, value: any) => {
    if (!parsedEvent) return;
    setParsedEvent({ ...parsedEvent, [field]: value });
  };

  return (
    <div className="event-input-form">
      <div className="form-header">
        <h2>Add New Event</h2>
        <div className="connection-badge connected">
          <span className="badge-dot"></span>
          <span>Connected to Google Calendar</span>
        </div>
      </div>

      <div className="input-section">
        <textarea
          className="event-input"
          placeholder='Add event like "Coffee with John tomorrow at 3pm"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleParse();
            }
          }}
          disabled={loading}
        />
        
        <button
          className="parse-button"
          onClick={handleParse}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Parsing...
            </>
          ) : (
            <>
              <span className="icon">🤖</span>
              Parse Event
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="message error-message">
          <span className="icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          <span className="icon">✓</span>
          {success}
        </div>
      )}

      {parsedEvent && (
        <div className="parsed-event-section">
          <h3>Event Details</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                value={parsedEvent.title}
                onChange={(e) => updateEventField('title', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={parsedEvent.startDateTime}
                onChange={(e) => updateEventField('startDateTime', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                value={parsedEvent.endDateTime}
                onChange={(e) => updateEventField('endDateTime', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={parsedEvent.category}
                onChange={(e) => updateEventField('category', e.target.value as EventType)}
              >
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="social">Social</option>
                <option value="meeting">Meeting</option>
                <option value="studying">Studying</option>
                <option value="free">Free Time</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={parsedEvent.priority}
                onChange={(e) => updateEventField('priority', parseInt(e.target.value) as PriorityLevel)}
              >
                <option value="1">Low (1)</option>
                <option value="2">Medium (2)</option>
                <option value="3">High (3)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Flexibility</label>
              <select
                value={parsedEvent.flexibility}
                onChange={(e) => updateEventField('flexibility', e.target.value as FlexibilityType)}
              >
                <option value="Rigid">Rigid (cannot move/overlap)</option>
                <option value="Passive">Passive (can overlap only)</option>
                <option value="Busy">Busy (can move only)</option>
                <option value="Flexible">Flexible (can move/overlap)</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description (Optional)</label>
              <textarea
                value={parsedEvent.description}
                onChange={(e) => updateEventField('description', e.target.value)}
                rows={2}
              />
            </div>

            {parsedEvent.attendees && parsedEvent.attendees.length > 0 && (
              <div className="form-group full-width">
                <label>Attendees</label>
                <div className="attendees-list">
                  {parsedEvent.attendees.map((attendee, idx) => (
                    <div key={idx} className="attendee-chip">
                      <span>{attendee.name || attendee.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              className="cancel-button"
              onClick={() => {
                setParsedEvent(null);
                setInput('');
              }}
            >
              Cancel
            </button>
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Add to Calendar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInputForm;

