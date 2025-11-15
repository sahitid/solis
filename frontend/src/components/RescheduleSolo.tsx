/**
 * Solo Event Rescheduling Component (Frontend Step 8)
 * Find available slots and reschedule without attendee coordination
 */

import React, { useState, useEffect } from 'react';
import { AuthUser } from '../utils/auth';
import API from '../utils/api';
import '../styles/RescheduleSolo.css';

interface EventData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priority: number;
  flexibility: string;
}

interface TimeSlot {
  startDateTime: string;
  endDateTime: string;
  score: number;
  reason: string;
  sameDay: boolean;
}

interface RescheduleSoloProps {
  event: EventData;
  user: AuthUser;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleSolo: React.FC<RescheduleSoloProps> = ({
  event,
  user,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [alternativeDays, setAlternativeDays] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [error, setError] = useState('');
  const [showAlternativeDays, setShowAlternativeDays] = useState(false);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await API.reschedule.findSlots(user.email, event.id);
      
      if (result.success && result.slots) {
        setSlots(result.slots);
        if (result.slots.length > 0) {
          setSelectedSlot(result.slots[0]);
        }
      } else {
        setError('No available time slots found');
      }
    } catch (err: any) {
      console.error('Failed to load time slots:', err);
      setError(err.response?.data?.error || 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const loadAlternativeDays = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await API.reschedule.findAlternativeDays(user.email, event.id);
      
      if (result.success && result.alternatives) {
        setAlternativeDays(result.alternatives);
        setShowAlternativeDays(true);
      }
    } catch (err: any) {
      console.error('Failed to load alternative days:', err);
      setError(err.response?.data?.error || 'Failed to load alternative days');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;

    setLoading(true);
    setError('');

    try {
      const result = await API.reschedule.executeSolo(
        user.email,
        event.id,
        selectedSlot.startDateTime,
        selectedSlot.endDateTime
      );

      if (result.success) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to reschedule:', err);
      setError(err.response?.data?.error || 'Failed to reschedule event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Reschedule Event</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="event-summary">
            <h3>{event.name}</h3>
            <div className="current-time">
              <span className="label">Current Time:</span>
              <span className="time">
                {new Date(event.startDate).toLocaleString()} - 
                {new Date(event.endDate).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="icon">⚠️</span>
              {error}
            </div>
          )}

          {loading && !slots.length ? (
            <div className="loading-section">
              <div className="spinner"></div>
              <p>Finding available time slots...</p>
            </div>
          ) : (
            <>
              {!showAlternativeDays ? (
                <div className="time-slots-section">
                  <div className="section-header">
                    <h4>Available Time Slots (Same Day)</h4>
                    <button
                      className="link-button"
                      onClick={loadAlternativeDays}
                      disabled={loading}
                    >
                      View Alternative Days
                    </button>
                  </div>

                  {slots.length === 0 ? (
                    <p className="no-slots">No available slots found on the same day</p>
                  ) : (
                    <div className="slots-list">
                      {slots.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`slot-card ${selectedSlot === slot ? 'selected' : ''}`}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <div className="slot-header">
                            <div className="slot-time">
                              <span className="icon">🕐</span>
                              <span>
                                {new Date(slot.startDateTime).toLocaleTimeString()} - 
                                {new Date(slot.endDateTime).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className={`score-badge score-${Math.floor(slot.score / 20)}`}>
                              {slot.score}%
                            </div>
                          </div>
                          <p className="slot-reason">{slot.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="alternative-days-section">
                  <div className="section-header">
                    <h4>Alternative Days</h4>
                    <button
                      className="link-button"
                      onClick={() => setShowAlternativeDays(false)}
                    >
                      Back to Same Day Slots
                    </button>
                  </div>

                  <div className="alternatives-list">
                    {alternativeDays.map((day, idx) => (
                      <div key={idx} className="day-card">
                        <div className="day-header">
                          <h5>{new Date(day.date).toDateString()}</h5>
                          <span className={`score-badge score-${Math.floor(day.dayScore / 20)}`}>
                            {day.dayScore}%
                          </span>
                        </div>
                        <div className="day-slots">
                          {day.slots.map((slot: TimeSlot, slotIdx: number) => (
                            <div
                              key={slotIdx}
                              className={`slot-card ${selectedSlot === slot ? 'selected' : ''}`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              <div className="slot-time">
                                {new Date(slot.startDateTime).toLocaleTimeString()} - 
                                {new Date(slot.endDateTime).toLocaleTimeString()}
                              </div>
                              <span className="slot-score">{slot.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
          <button
            className="action-button primary"
            onClick={handleReschedule}
            disabled={loading || !selectedSlot}
          >
            {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleSolo;

