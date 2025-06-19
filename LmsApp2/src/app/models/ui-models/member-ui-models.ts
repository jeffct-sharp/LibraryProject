/**
 * UI-specific models for members feature
 * Note: These are different from DTOs and are used only in the frontend
 */

export interface MemberFilterUiModel {
  name?: string;
  email?: string;
  status?: string;
  hasOverdue?: boolean;
  hasFines?: boolean;
  searchTerm?: string;
  membershipStatus?: string[];
  page: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface MemberFormStateUiModel {
  isSubmitting: boolean;
  errors: {[key: string]: string};
  isDirty: boolean;
}

export interface MemberProfileUiModel {
  memberInfo: {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    status: string;
  };
  borrowingStats: {
    totalBorrowed: number;
    currentlyBorrowed: number;
    overdue: number;
    fines: number;
  };
}

// Frontend-specific model for member display
export interface MemberUiModel {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: string; // Read-only, no change functionality
}

// Frontend-specific model for member search parameters
export interface MemberSearchParamsUiModel {
  searchTerm?: string;
  name?: string;
  email?: string;
  status?: string[];
  hasOverdue?: boolean;
  hasFines?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Frontend-specific model for displaying member details with extended info
export interface MemberDetailsUiModel {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  address?: string;
  status: string; // Read-only, no change functionality
  borrowingHistory: {
    total: number;
    current: number;
    overdue: number;
  };
  fines: {
    total: number;
    unpaid: number;
  };
}

// UI model for creating members
export interface MemberCreateUiModel {
  name: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
  role?: string;
}
