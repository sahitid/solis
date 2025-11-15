/**
 * Authentication Utilities
 * Handles Google OAuth flow and token management
 */

import { API } from './api';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
  token_type: string;
}

export interface AuthUser {
  email: string;
  name: string;
  onboardingCompleted: boolean;
}

/**
 * Initiates Google OAuth flow
 */
export async function initiateOAuth(): Promise<void> {
  try {
    const { authUrl } = await API.auth.getOAuthUrl();
    
    // Open OAuth URL in new tab
    if (chrome?.tabs) {
      await chrome.tabs.create({ url: authUrl });
    } else {
      window.open(authUrl, '_blank');
    }
  } catch (error) {
    console.error('Failed to initiate OAuth:', error);
    throw error;
  }
}

/**
 * Stores auth tokens in Chrome storage
 */
export async function storeAuthTokens(tokens: AuthTokens, user: AuthUser): Promise<void> {
  try {
    await chrome.storage.local.set({
      authTokens: tokens,
      currentUser: user,
      lastSync: Date.now(),
    });
  } catch (error) {
    console.error('Failed to store auth tokens:', error);
    throw error;
  }
}

/**
 * Retrieves auth tokens from Chrome storage
 */
export async function getAuthTokens(): Promise<{ tokens: AuthTokens; user: AuthUser } | null> {
  try {
    const result = await chrome.storage.local.get(['authTokens', 'currentUser']);
    
    if (result.authTokens && result.currentUser) {
      return {
        tokens: result.authTokens,
        user: result.currentUser,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get auth tokens:', error);
    return null;
  }
}

/**
 * Checks if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const authData = await getAuthTokens();
  
  if (!authData) {
    return false;
  }
  
  // Check if token is expired
  if (authData.tokens.expiry_date < Date.now()) {
    // Try to refresh token
    try {
      const refreshResult = await API.auth.refreshToken(
        authData.user.email,
        authData.tokens.refresh_token
      );
      
      if (refreshResult.success) {
        await storeAuthTokens(refreshResult.tokens, authData.user);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  return true;
}

/**
 * Gets current user info
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const authData = await getAuthTokens();
  return authData?.user || null;
}

/**
 * Logs out the user
 */
export async function logout(): Promise<void> {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      await API.auth.logout(user.email);
    }
    
    await chrome.storage.local.remove(['authTokens', 'currentUser', 'lastSync']);
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Checks authentication status with backend
 */
export async function checkAuthStatus(email: string): Promise<boolean> {
  try {
    const response: any = await API.auth.checkStatus(email);
    return response.authenticated === true;
  } catch (error) {
    console.error('Auth status check failed:', error);
    return false;
  }
}

/**
 * Refreshes access token if needed
 */
export async function ensureValidToken(): Promise<boolean> {
  const authData = await getAuthTokens();
  
  if (!authData) {
    return false;
  }
  
  // Check if token expires in next 5 minutes
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  
  if (authData.tokens.expiry_date < fiveMinutesFromNow) {
    try {
      const refreshResult = await API.auth.refreshToken(
        authData.user.email,
        authData.tokens.refresh_token
      );
      
      if (refreshResult.success) {
        await storeAuthTokens(refreshResult.tokens, authData.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
  
  return true;
}

