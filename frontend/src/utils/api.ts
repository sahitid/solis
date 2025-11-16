/**
 * API Utility Functions
 * Handles all HTTP requests to the backend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_CONFIG, ENDPOINTS } from '../config/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth tokens here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh
          console.log('Unauthorized - token may need refresh');
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new APIClient();

// Convenience functions for common operations
export const API = {
  // Authentication
  auth: {
    getOAuthUrl: () => apiClient.get<{ authUrl: string }>(ENDPOINTS.AUTH.GOOGLE),
    checkStatus: (email: string) => 
      apiClient.get(ENDPOINTS.AUTH.STATUS, { params: { email } }),
    refreshToken: (email: string, refreshToken: string) =>
      apiClient.post(ENDPOINTS.AUTH.REFRESH_TOKEN, { email, refreshToken }),
    logout: (email: string) =>
      apiClient.post(ENDPOINTS.AUTH.LOGOUT, { email }),
  },

  // Preferences
  preferences: {
    get: (email: string) => apiClient.get(ENDPOINTS.PREFERENCES.GET(email)),
    update: (email: string, preferences: any) =>
      apiClient.put(ENDPOINTS.PREFERENCES.UPDATE(email), preferences),
    llmAssist: (userMessage: string, conversationHistory: any[]) =>
      apiClient.post(ENDPOINTS.PREFERENCES.LLM_ASSIST, { userMessage, conversationHistory }),
    parse: (userInput: string) =>
      apiClient.post(ENDPOINTS.PREFERENCES.PARSE, { userInput }),
  },

  // Events
  events: {
    parse: (userInput: string, email: string) =>
      apiClient.post(ENDPOINTS.EVENTS.PARSE, { userInput, email }),
    create: (email: string, eventData: any, skipConflictCheck = false) =>
      apiClient.post(ENDPOINTS.EVENTS.CREATE, { email, eventData, skipConflictCheck }),
    sync: (email: string) =>
      apiClient.post(ENDPOINTS.EVENTS.SYNC, { email }),
    get: (email: string, startDate?: string, endDate?: string) =>
      apiClient.get(ENDPOINTS.EVENTS.GET(email), { params: { startDate, endDate } }),
    update: (eventId: string, email: string, updates: any) =>
      apiClient.put(ENDPOINTS.EVENTS.UPDATE(eventId), { email, updates }),
    delete: (eventId: string, email: string) =>
      apiClient.delete(ENDPOINTS.EVENTS.DELETE(eventId), { data: { email } }),
  },

  // Conflicts
  conflicts: {
    check: (email: string, newEvent: any) =>
      apiClient.post(ENDPOINTS.CONFLICTS.CHECK, { email, newEvent }),
    checkCascade: (email: string, eventId: string, newTimeSlot: any) =>
      apiClient.post(ENDPOINTS.CONFLICTS.CHECK_CASCADE, { email, eventId, newTimeSlot }),
    compare: (email: string, event1Id: string, event2Id: string) =>
      apiClient.post(ENDPOINTS.CONFLICTS.COMPARE, { email, event1Id, event2Id }),
    getSummary: (email: string, days = 30) =>
      apiClient.get(ENDPOINTS.CONFLICTS.SUMMARY(email), { params: { days } }),
  },

  // Rescheduling
  reschedule: {
    findBestSlot: (email: string, eventId: string, sameDay = false) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.FIND_BEST_SLOT, { email, eventId, sameDay }),
    findAlternativeDays: (email: string, eventId: string, searchDays = 14) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.FIND_ALTERNATIVE_DAYS, { email, eventId, searchDays }),
    findSameDaySlots: (email: string, eventId: string, maxSlots = 3) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.FIND_SAME_DAY_SLOTS, { email, eventId, maxSlots }),
    executeSolo: (email: string, eventId: string, newTimeSlot: any) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.EXECUTE_SOLO, { email, eventId, newTimeSlot }),
    proposeMultiAttendee: (email: string, eventId: string, newTimeSlot: any, reason?: string) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.PROPOSE_MULTI, { email, eventId, newTimeSlot, reason }),
    recordResponse: (proposalId: string, attendeeEmail: string, response: string) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.RECORD_RESPONSE, { proposalId, attendeeEmail, response }),
    finalizeProposal: (email: string, proposalId: string) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.FINALIZE, { email, proposalId }),
    getProposal: (proposalId: string, email: string) =>
      apiClient.get(ENDPOINTS.RESCHEDULE.GET_PROPOSAL(proposalId), { params: { email } }),
    cancelEvent: (email: string, eventId: string, reason?: string) =>
      apiClient.post(ENDPOINTS.RESCHEDULE.CANCEL_EVENT, { email, eventId, reason }),
  },
};

export default API;

