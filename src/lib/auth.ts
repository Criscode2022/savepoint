// Auth client for Neon Auth
// Uses fetch with proper cookie handling (same as dog-reservation)
import { environment } from '../environments/environment';

const NEON_AUTH_URL = environment.neonAuthUrl;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

export interface AuthSessionData {
  // Session object (from getSession endpoint)
  session?: {
    token?: string;
    access_token?: string;
    accessToken?: string;
  } | null;
  // User data
  user?: AuthUser | null;
  // Token might be at root level (from sign-in/sign-up endpoints)
  token?: string;
  access_token?: string;
  accessToken?: string;
}

export const authClient = {
  /**
   * Get current session using cookie
   */
  async getSession(): Promise<{ data: AuthSessionData | null; error: Error | null }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/get-session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { data: null, error: null };
        }
        throw new Error(`Session fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Sign in with email/password
   */
  async signIn(email: string, password: string): Promise<{ data: AuthSessionData | null; error: Error | null }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Sign in failed' }));
        throw new Error(error.message || 'Sign in failed');
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Sign up with email/password
   */
  async signUp(email: string, password: string, name?: string): Promise<{ data: AuthSessionData | null; error: Error | null }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Sign up failed' }));
        throw new Error(error.message || 'Sign up failed');
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await fetch(`${NEON_AUTH_URL}/sign-out`, {
        method: 'POST',
        credentials: 'include',
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};
