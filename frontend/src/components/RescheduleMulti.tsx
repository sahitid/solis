/**
 * Multi-Attendee Event Rescheduling Component (Frontend Step 9)
 * Propose reschedule to all attendees, track responses, majority vote
 */

import React, { useState, useEffect } from 'react';
import { AuthUser } from '../utils/auth';
import API from '../utils/api';
import '../styles/RescheduleMulti.css';

interface EventData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  attendees?: Array<{ name?: string; email: string; status?: string }>;
}

interface TimeSlot {
  startDateTime: string;
  endDateTime: string;
  score: number;
  reason: string;
}

interface RescheduleMultiProps {
  event: EventData;
  user: AuthUser;
  reason: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProposalStatus {
  proposalId: string;
  status: 'pending' | 'approved' | 'rejected';
  responses: Array<{
    attendeeEmail: string;
    vote: 'accept' | 'reject';
    timestamp: string;
  }>;
  totalAttendees: number;
  acceptCount: number;
  rejectCount: number;
}

const RescheduleMulti: React.FC<RescheduleMultiProps> = ({
  event,
  user,
  reason,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [error, setError] = useState('');
  const [proposalSent, setProposalSent] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus | null>(null);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (proposalSent && proposalStatus) {
      // Poll for updates every 10 seconds
      interval = setInterval(() => {
        checkProposalStatus(proposalStatus.proposalId);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [proposalSent, proposalStatus]);

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

  const handleSendProposal = async () => {
    if (!selectedSlot) return;

    setLoading(true);
    setError('');

    try {
      const result = await API.reschedule.proposeMultiAttendee(
        user.email,
        event.id,
        {
          startDateTime: selectedSlot.startDateTime,
          endDateTime: selectedSlot.endDateTime
        },
        reason
      );

      if (result.success) {
        setProposalSent(true);
        setProposalStatus({
          proposalId: result.proposalId || result.proposal?.id,
          status: 'pending',
          responses: [],
          totalAttendees: event.attendees?.length || 0,
          acceptCount: 0,
          rejectCount: 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to send proposal:', err);
      setError(err.response?.data?.error || 'Failed to send proposal');
    } finally {
      setLoading(false);
    }
  };

  const checkProposalStatus = async (proposalId: string) => {
    try {
      const result = await API.reschedule.getProposal(proposalId, user.email);
      
      if (result.success && result.proposal) {
        const proposal = result.proposal;
        setProposalStatus({
          proposalId: proposal.id,
          status: proposal.status,
          responses: (proposal.attendeeResponses || []).map((r: any) => ({
            attendeeEmail: r.email,
            vote: r.response === 'yes' ? 'accept' : r.response === 'no' ? 'reject' : 'accept', // map tentative as accept for bar, can refine
            timestamp: r.responseDate || new Date().toISOString(),
          })),
          totalAttendees: proposal.attendeeResponses?.length || 0,
          acceptCount: proposal.majorityVoteResult?.yesCount || 0,
          rejectCount: proposal.majorityVoteResult?.noCount || 0,
        });

        if (proposal.status === 'approved') {
          // Auto-finalize if approved
          await finalizeProposal(proposalId);
        }
      }
    } catch (err) {
      console.error('Failed to check proposal status:', err);
    }
  };

  const finalizeProposal = async (proposalId: string) => {
    try {
      const result = await API.reschedule.finalizeProposal(user.email, proposalId);
      
      if (result.success) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to finalize proposal:', err);
    }
  };

  if (proposalSent && proposalStatus) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container proposal-status-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📧 Reschedule Proposal Sent</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="modal-content">
            <div className="proposal-summary">
              <h3>{event.name}</h3>
              <div className="proposed-time">
                <span className="label">Proposed New Time:</span>
                <div className="time">
                  {selectedSlot && (
                    <>
                      {new Date(selectedSlot.startDateTime).toLocaleString()} - 
                      {new Date(selectedSlot.endDateTime).toLocaleTimeString()}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={`status-card status-${proposalStatus.status}`}>
              <div className="status-icon">
                {proposalStatus.status === 'pending' && '⏳'}
                {proposalStatus.status === 'approved' && '✅'}
                {proposalStatus.status === 'rejected' && '❌'}
              </div>
              <h4>
                {proposalStatus.status === 'pending' && 'Waiting for Responses'}
                {proposalStatus.status === 'approved' && 'Approved'}
                {proposalStatus.status === 'rejected' && 'Rejected'}
              </h4>
            </div>

            <div className="vote-summary">
              <div className="vote-bar">
                <div
                  className="vote-bar-accept"
                  style={{
                    width: `${(proposalStatus.acceptCount / proposalStatus.totalAttendees) * 100}%`
                  }}
                ></div>
                <div
                  className="vote-bar-reject"
                  style={{
                    width: `${(proposalStatus.rejectCount / proposalStatus.totalAttendees) * 100}%`
                  }}
                ></div>
              </div>
              
              <div className="vote-counts">
                <div className="vote-count accept">
                  <span className="icon">✓</span>
                  <span>{proposalStatus.acceptCount} Accept</span>
                </div>
                <div className="vote-count reject">
                  <span className="icon">✗</span>
                  <span>{proposalStatus.rejectCount} Reject</span>
                </div>
                <div className="vote-count pending">
                  <span className="icon">⏳</span>
                  <span>
                    {proposalStatus.totalAttendees - proposalStatus.acceptCount - proposalStatus.rejectCount} Pending
                  </span>
                </div>
              </div>
            </div>

            {proposalStatus.responses.length > 0 && (
              <div className="responses-list">
                <h4>Responses</h4>
                {proposalStatus.responses.map((response, idx) => (
                  <div key={idx} className={`response-item ${response.vote}`}>
                    <span className="icon">
                      {response.vote === 'accept' ? '✓' : '✗'}
                    </span>
                    <span className="email">{response.attendeeEmail}</span>
                    <span className="time">
                      {new Date(response.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="info-box">
              <p>
                📧 All attendees have been notified via email with links to accept or reject the proposal.
              </p>
              <p>
                The event will be automatically rescheduled when the majority (>50%) of attendees accept.
              </p>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="action-button secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container reschedule-multi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 Propose Reschedule to Attendees</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="event-summary">
            <h3>{event.name}</h3>
            <div className="attendees-info">
              <span className="icon">👥</span>
              <span>{event.attendees?.length || 0} attendees will be notified</span>
            </div>
            {event.attendees && event.attendees.length > 0 && (
              <div className="attendees-list">
                {event.attendees.map((attendee, idx) => (
                  <div key={idx} className="attendee-chip">
                    {attendee.name || attendee.email}
                  </div>
                ))}
              </div>
            )}
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
            <div className="time-slots-section">
              <h4>Select New Time</h4>
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
                          {new Date(slot.startDateTime).toLocaleString()} - 
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
            </div>
          )}

          <div className="info-box">
            <p>
              All attendees will receive an email with the proposed new time and links to accept or reject.
            </p>
            <p>
              The event will be rescheduled automatically when more than 50% of attendees accept.
            </p>
          </div>
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
            onClick={handleSendProposal}
            disabled={loading || !selectedSlot}
          >
            {loading ? 'Sending...' : 'Send Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleMulti;

