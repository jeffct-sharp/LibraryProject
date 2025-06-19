/**
 * Frontend-specific authentication models
 * These are not DTOs sent to/from the API
 */

/**
 * Represents an authenticated user in the frontend
 */
export interface AuthUserUiModel {
  username: string;
  roles: string[];
  token: string;
  userId?: string | number;
  isAuthenticated: boolean;
  memberId?: number;
  expiresAt?: Date;
}

/**
 * Tracks authentication operation state
 */
export interface AuthStateUiModel {
  isLoading: boolean;
  error: string | null;
}
