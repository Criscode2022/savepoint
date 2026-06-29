// Auth client for Neon Auth
// Uses fetch with proper cookie handling (same as dog-reservation)
import { environment } from "../environments/environment";

const NEON_AUTH_URL = environment.neonAuthUrl;

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
}

export type JwtTokenResult =
  | { ok: true; token: string }
  | { ok: false; unauthorized: boolean };

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

  // Some endpoints may return the token nested
  data?: {
    token?: string;
    access_token?: string;
    accessToken?: string;
  };
}

export const authClient = {
  /**
   * Retrieve a JWT token for authorizing requests (Bearer token).
   *
   * This calls the Neon Auth `token` endpoint which uses the session cookie.
   * Works even when the cookie is HttpOnly (not readable from JS).
   */
  async getJWTToken(): Promise<JwtTokenResult> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/token`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return { ok: false, unauthorized: response.status === 401 };
      }

      // Prefer JSON but gracefully fall back to text.
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as
          | AuthSessionData
          | Record<string, unknown>;
        const anyData = data as any;
        const token =
          anyData?.token ||
          anyData?.access_token ||
          anyData?.accessToken ||
          anyData?.data?.token ||
          anyData?.data?.access_token ||
          anyData?.data?.accessToken ||
          anyData?.session?.token ||
          anyData?.session?.access_token ||
          anyData?.session?.accessToken ||
          null;

        if (token) {
          return { ok: true, token };
        }

        return { ok: false, unauthorized: false };
      }

      const text = await response.text();
      if (text) {
        return { ok: true, token: text };
      }

      return { ok: false, unauthorized: false };
    } catch {
      return { ok: false, unauthorized: false };
    }
  },

  /**
   * Get current session using cookie
   */
  async getSession(): Promise<{
    data: AuthSessionData | null;
    error: Error | null;
  }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/get-session`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
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
  async signIn(
    email: string,
    password: string,
  ): Promise<{ data: AuthSessionData | null; error: Error | null }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Sign in failed" }));
        throw new Error(
          error.message || error.error?.message || "Sign in failed",
        );
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
  async signUp(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ data: AuthSessionData | null; error: Error | null }> {
    try {
      const response = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Sign up failed" }));
        throw new Error(
          error.message || error.error?.message || "Sign up failed",
        );
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
        method: "POST",
        credentials: "include",
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};
