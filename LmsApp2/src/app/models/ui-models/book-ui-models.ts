/**
 * UI-specific models for books feature
 */

// Keep - Used for advanced filtering
export interface BookFilterUiModel {
  searchTerm?: string;
  genres?: string[];
  availableOnly?: boolean;
  yearRange?: {min: number, max: number};
  page: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

// Keep - Used for form state management
export interface BookFormStateUiModel {
  isSubmitting: boolean;
  errors: {[key: string]: string};
  isDirty: boolean;
}

// New - For availability display
export interface BookAvailabilityUiModel {
  status: 'available' | 'limited' | 'unavailable';
  availableCopies: number;
  totalCopies?: number;
  displayText: string;
}

// Simplify - Remove redundant fields
export interface BookDisplayUiModel {
  id: number;
  title: string;
  author: string;
  genre: string;
  yearPublished: number;
  availability: {
    status: 'available' | 'limited' | 'unavailable';
    availableCopies: number;
    totalCopies?: number;
  };
}

// UI-specific search model that extends the DTO with additional search parameters
export interface BookSearchUiModel {
  title?: string;
  author?: string;
  genre?: string;
  isbn?: string;
  availableCopiesGreaterThanZero?: boolean;
  // Additional UI-specific search parameters
  searchTerm?: string;
  availableOnly?: boolean;
  yearPublished?: number;
  yearPublishedFrom?: number;
  yearPublishedTo?: number;
}
