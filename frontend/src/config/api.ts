/**
 * API Configuration
 * Global API variable that can be edited for where the server is hosted
 */

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    GOOGLE: '/auth/google',
    CALLBACK: '/auth/google/callback',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    STATUS: '/auth/status',
  },
  
  // Preferences
  PREFERENCES: {
    GET: (email: string) => `/preferences/${email}`,
    UPDATE: (email: string) => `/preferences/${email}`,
    LLM_ASSIST: '/preferences/llm-assist',
    PARSE: '/preferences/parse-preferences',
  },
  
  // Events
  EVENTS: {
    PARSE: '/events/parse',
    CREATE: '/events/create',
    SYNC: '/events/sync',
    GET: (email: string) => `/events/${email}`,
    UPDATE: (eventId: string) => `/events/${eventId}`,
    DELETE: (eventId: string) => `/events/${eventId}`,
  },
  
  // Conflicts
  CONFLICTS: {
    CHECK: '/conflicts/check',
    CHECK_CASCADE: '/conflicts/check-cascade',
    COMPARE: '/conflicts/compare',
    SUMMARY: (email: string) => `/conflicts/summary/${email}`,
  },
  
  // Rescheduling
  RESCHEDULE: {
    FIND_BEST_SLOT: '/reschedule/find-best-slot',
    FIND_ALTERNATIVE_DAYS: '/reschedule/find-alternative-days',
    FIND_SAME_DAY_SLOTS: '/reschedule/find-same-day-slots',
    EXECUTE_SOLO: '/reschedule/execute-solo',
    PROPOSE_MULTI: '/reschedule/propose-multi-attendee',
    RECORD_RESPONSE: '/reschedule/record-response',
    FINALIZE: '/reschedule/finalize-proposal',
    GET_PROPOSAL: (proposalId: string) => `/reschedule/proposal/${proposalId}`,
  },
};

export default API_CONFIG;

