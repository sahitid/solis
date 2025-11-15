/**
 * Settings Page (Frontend Step 5)
 * User preferences, Google Calendar connection, LLM-assisted setup
 */

import React, { useState, useEffect } from 'react';
import { AuthUser, login } from '../utils/auth';
import API from '../utils/api';
import { UserPreferences } from '../types';
import '../styles/SettingsPage.css';

interface SettingsPageProps {
  user: AuthUser | null;
  authenticated: boolean;
  onLoginSuccess: (user: AuthUser) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  authenticated,
  onLoginSuccess,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [llmInput, setLlmInput] = useState('');
  const [showLlmHelper, setShowLlmHelper] = useState(false);

  useEffect(() => {
    if (authenticated && user) {
      loadPreferences();
    }
  }, [authenticated, user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result: any = await API.preferences.get(user.email);
      if (result.preferences) {
        setPreferences(result.preferences);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const userData = await login();
      onLoginSuccess(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google');
    }
  };

  const handleSavePreferences = async () => {
    if (!user || !preferences) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await API.preferences.update(user.email, preferences);
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleLlmAssist = async () => {
    if (!user || !llmInput.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result: any = await API.preferences.llmSetup(user.email, llmInput);
      if (result.preferences) {
        setPreferences(result.preferences);
        setLlmInput('');
        setShowLlmHelper(false);
        setSuccess('AI analyzed your preferences!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process AI setup');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (field: string, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [field]: value });
  };

  if (!authenticated || !user) {
    return (
      <div className="settings-container">
        <div className="connection-section">
          <div className="connection-card">
            <div className="connection-icon">🔗</div>
            <h2>Connect Google Calendar</h2>
            <p>To use Solis, you need to connect your Google Calendar account.</p>
            
            <ul className="permissions-list">
              <li>✓ Read and manage your calendar events</li>
              <li>✓ Send emails on your behalf (for reschedule proposals)</li>
              <li>✓ Access your basic profile information</li>
            </ul>

            <button className="google-login-button" onClick={handleGoogleLogin}>
              <span className="google-icon">G</span>
              Connect with Google
            </button>

            {error && (
              <div className="error-message">
                <span className="icon">⚠️</span>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <button
          className="ai-setup-button"
          onClick={() => setShowLlmHelper(!showLlmHelper)}
        >
          <span className="icon">🤖</span>
          AI Setup Assistant
        </button>
      </div>

      {success && (
        <div className="message success-message">
          <span className="icon">✓</span>
          {success}
        </div>
      )}

      {error && (
        <div className="message error-message">
          <span className="icon">⚠️</span>
          {error}
        </div>
      )}

      {showLlmHelper && (
        <div className="llm-helper-section">
          <h3>🤖 AI Preference Setup</h3>
          <p>Describe your schedule preferences in natural language, and our AI will configure your settings.</p>
          <textarea
            className="llm-input"
            placeholder='E.g., "I prefer morning meetings between 9-11am, I work best in the afternoon, I need lunch at 12pm, and I like to end my day by 5pm"'
            value={llmInput}
            onChange={(e) => setLlmInput(e.target.value)}
            rows={4}
          />
          <button
            className="llm-submit-button"
            onClick={handleLlmAssist}
            disabled={loading || !llmInput.trim()}
          >
            {loading ? 'Processing...' : 'Analyze with AI'}
          </button>
        </div>
      )}

      {loading && !preferences ? (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Loading preferences...</p>
        </div>
      ) : preferences ? (
        <div className="preferences-form">
          <section className="preference-section">
            <h2>Working Hours</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={preferences.workingHoursStart}
                  onChange={(e) => updatePreference('workingHoursStart', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={preferences.workingHoursEnd}
                  onChange={(e) => updatePreference('workingHoursEnd', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="preference-section">
            <h2>Preferred Meeting Times</h2>
            <div className="time-slots">
              {['Morning (6am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-9pm)'].map((slot) => (
                <label key={slot} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={preferences.preferredMeetingTimes?.includes(slot) || false}
                    onChange={(e) => {
                      const times = preferences.preferredMeetingTimes || [];
                      updatePreference(
                        'preferredMeetingTimes',
                        e.target.checked
                          ? [...times, slot]
                          : times.filter((t) => t !== slot)
                      );
                    }}
                  />
                  <span>{slot}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="preference-section">
            <h2>Break Times</h2>
            <div className="breaks-list">
              {preferences.breakTimes?.map((breakTime, idx) => (
                <div key={idx} className="break-item">
                  <input
                    type="time"
                    value={breakTime.start}
                    onChange={(e) => {
                      const breaks = [...(preferences.breakTimes || [])];
                      breaks[idx].start = e.target.value;
                      updatePreference('breakTimes', breaks);
                    }}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={breakTime.end}
                    onChange={(e) => {
                      const breaks = [...(preferences.breakTimes || [])];
                      breaks[idx].end = e.target.value;
                      updatePreference('breakTimes', breaks);
                    }}
                  />
                  <button
                    className="remove-button"
                    onClick={() => {
                      const breaks = preferences.breakTimes?.filter((_, i) => i !== idx);
                      updatePreference('breakTimes', breaks);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="add-button"
                onClick={() => {
                  const breaks = [...(preferences.breakTimes || []), { start: '12:00', end: '13:00' }];
                  updatePreference('breakTimes', breaks);
                }}
              >
                + Add Break Time
              </button>
            </div>
          </section>

          <section className="preference-section">
            <h2>Event Priorities</h2>
            <div className="priorities-grid">
              {['work', 'personal', 'social', 'meeting', 'studying', 'free'].map((category) => (
                <div key={category} className="priority-item">
                  <label>{category.charAt(0).toUpperCase() + category.slice(1)}</label>
                  <select
                    value={preferences.eventPriorities?.[category] || 2}
                    onChange={(e) => {
                      const priorities = { ...preferences.eventPriorities, [category]: parseInt(e.target.value) };
                      updatePreference('eventPriorities', priorities);
                    }}
                  >
                    <option value="1">Low (1)</option>
                    <option value="2">Medium (2)</option>
                    <option value="3">High (3)</option>
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section className="preference-section">
            <h2>Buffer Times</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Before Events (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.bufferBefore || 0}
                  onChange={(e) => updatePreference('bufferBefore', parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>After Events (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={preferences.bufferAfter || 0}
                  onChange={(e) => updatePreference('bufferAfter', parseInt(e.target.value))}
                />
              </div>
            </div>
          </section>

          <div className="form-actions">
            <button
              className="save-button"
              onClick={handleSavePreferences}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsPage;

