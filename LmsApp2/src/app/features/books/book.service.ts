import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  BookDetailsDto,
  CreateBookDto,
  UpdateBookDto
} from '../../models/dtos/book-dtos';
import { PaginatedResponseUiModel } from '../../models/ui-models/transaction-ui-models';
import { BookSearchUiModel } from '../../models/ui-models/book-ui-models';
import { environment } from '../../../environments/environment';

export interface BookPaginationParams {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  title?: string;
  author?: string;
  genre?: string;
  isbn?: string;
  searchTerm?: string;
  yearPublishedFrom?: number;
  yearPublishedTo?: number;
  availableCopiesGreaterThanZero?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = `${environment.apiBaseUrl}/api/Books`;
  // Cache for client-side operations
  private booksCache: BookDetailsDto[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(private http: HttpClient) {}

  // Get all books
  getBooks(): Observable<BookDetailsDto[]> {
    // Check if we have a recent cache
    const now = Date.now();
    if (this.booksCache.length > 0 && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return of(this.booksCache);
    }

    // If cache is empty or expired, fetch from API
    return this.http.get<BookDetailsDto[]>(this.apiUrl)
      .pipe(
        map(books => {
          // Update the cache
          this.booksCache = books;
          this.lastFetchTime = now;
          return books;
        }),
        catchError(this.handleError)
      );
  }

  // Get a single book by ID
  getBook(id: number): Observable<BookDetailsDto> {
    return this.http.get<BookDetailsDto>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error fetching book with ID ${id}:`, error);
          return throwError(() => new Error(`Failed to fetch book: ${error.message || 'Unknown error'}`));
        })
      );
  }

  // Add a new book
  addBook(book: CreateBookDto): Observable<BookDetailsDto> {
    return this.http.post<BookDetailsDto>(this.apiUrl, book)
      .pipe(
        map(newBook => {
          // Clear cache so next getBooks() will fetch fresh data
          this.clearCache();
          return newBook;
        }),
        catchError(this.handleError)
      );
  }

  // Update an existing book
  updateBook(book: UpdateBookDto): Observable<BookDetailsDto> {
    return this.http.put<BookDetailsDto>(this.apiUrl, book)
      .pipe(
        map(updatedBook => {
          // Clear cache so next getBooks() will fetch fresh data
          this.clearCache();
          return updatedBook;
        }),
        catchError(this.handleError)
      );
  }

  // Delete a book
  deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        map(() => {
          // Clear cache so next getBooks() will fetch fresh data
          this.clearCache();
        }),
        catchError(this.handleError)
      );
  }

  // Search books using the search endpoint
  searchBooks(params: BookSearchUiModel = {}): Observable<BookDetailsDto[]> {
    let httpParams = new HttpParams();
    
    // Add search parameters to query string
    if (params.title) httpParams = httpParams.set('title', params.title);
    if (params.author) httpParams = httpParams.set('author', params.author);
    if (params.genre) httpParams = httpParams.set('genre', params.genre);
    if (params.isbn) httpParams = httpParams.set('isbn', params.isbn);
    if (params.availableCopiesGreaterThanZero !== undefined) {
      httpParams = httpParams.set('availableCopiesGreaterThanZero', params.availableCopiesGreaterThanZero.toString());
    }
    
    return this.http.get<BookDetailsDto[]>(`${this.apiUrl}/search`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  // Client-side implementation of paginated books
  getBooksWithPagination(params: BookPaginationParams): Observable<PaginatedResponseUiModel<BookDetailsDto>> {
    // Fetch all books first, then handle pagination client-side
    return this.getBooks().pipe(
      map(allBooks => {
        // Apply client-side filtering
        let filteredBooks = this.filterBooks(allBooks, params);
        
        // Apply client-side sorting
        filteredBooks = this.sortBooks(filteredBooks, params.sortBy, params.sortDirection);
        
        // Get total count before pagination
        const totalCount = filteredBooks.length;
        
        // Apply client-side pagination
        const pageNumber = params.pageNumber || 1;
        const pageSize = params.pageSize || 10;
        const startIndex = (pageNumber - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
        
        // Return in the expected PaginatedResponseUiModel format
        return {
          items: paginatedBooks,
          totalCount: totalCount,
          pageNumber: pageNumber,
          pageSize: pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
        };
      }),
      catchError(error => {
        console.error('Error in client-side pagination:', error);
        return throwError(() => error);
      })
    );
  }

  // Helper method to filter books client-side
  private filterBooks(books: BookDetailsDto[], params: BookPaginationParams): BookDetailsDto[] {
    return books.filter(book => {
      // Check each filter condition
      if (params.searchTerm) {
        const searchTerm = params.searchTerm.toLowerCase();
        const matchesSearchTerm = 
          book.title.toLowerCase().includes(searchTerm) ||
          book.author.toLowerCase().includes(searchTerm) ||
          book.genre?.toLowerCase().includes(searchTerm) ||
          book.isbn.includes(params.searchTerm);
        
        if (!matchesSearchTerm) return false;
      }
      
      if (params.title && !book.title.toLowerCase().includes(params.title.toLowerCase())) {
        return false;
      }
      
      if (params.author && !book.author.toLowerCase().includes(params.author.toLowerCase())) {
        return false;
      }
      
      if (params.genre && !book.genre?.toLowerCase().includes(params.genre.toLowerCase())) {
        return false;
      }
      
      if (params.isbn && !book.isbn.includes(params.isbn)) {
        return false;
      }
      
      if (params.yearPublishedFrom && book.yearPublished && book.yearPublished < params.yearPublishedFrom) {
        return false;
      }
      
      if (params.yearPublishedTo && book.yearPublished && book.yearPublished > params.yearPublishedTo) {
        return false;
      }
      
      if (params.availableCopiesGreaterThanZero && book.availableCopies <= 0) {
        return false;
      }
      
      // If all filters pass, keep the book
      return true;
    });
  }

  // Helper method to sort books client-side
  private sortBooks(books: BookDetailsDto[], sortBy?: string, sortDirection?: string): BookDetailsDto[] {
    if (!sortBy || !sortDirection) {
      return books; // No sorting needed
    }
    
    return [...books].sort((a, b) => {
      let valueA = this.getPropertyValue(a, sortBy);
      let valueB = this.getPropertyValue(b, sortBy);
      
      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      // Handle null values
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      // Compare values
      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Helper to safely get property value (handles nested properties)
  private getPropertyValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  // Clear the books cache
  clearCache(): void {
    this.booksCache = [];
    this.lastFetchTime = 0;
  }

  // Common error handler
  private handleError(error: any) {
    console.error('API error:', error);
    if (error.error?.errors) {
      console.error('Validation errors:', error.error.errors);
    }
    return throwError(() => error);
  }
}
