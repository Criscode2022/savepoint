export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}