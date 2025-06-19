/**
 * Book related DTOs
 */

export interface BookDetailsDto {
  bookID: number;
  title: string;
  author: string;
  genre: string;
  isbn: string;
  yearPublished: number | null;
  availableCopies: number;
}

export interface CreateBookDto {
  title: string;          // Required, max 255 chars
  author: string;         // Required, max 100 chars
  genre?: string;         // Optional, max 50 chars
  isbn: string;           // Required, exactly 13 digits
  yearPublished: number;  
  availableCopies: number; // Required, minimum 1
}

export interface UpdateBookDto {
  bookID: number;         // Required
  title?: string;         // Optional, max 255 chars
  author?: string;        // Optional, max 100 chars
  genre?: string;         // Optional, max 50 chars
  isbn?: string;          // Optional, exactly 13 digits
  yearPublished?: number;
  availableCopies?: number; // Minimum 0
}

export interface SearchBooksDto {
  title?: string;         // Optional, max 50 chars
  author?: string;        // Optional, max 50 chars
  genre?: string;         // Optional, max 50 chars
  isbn?: string;          // Optional, max 15 chars
  availableCopiesGreaterThanZero?: boolean; // Optional
}
