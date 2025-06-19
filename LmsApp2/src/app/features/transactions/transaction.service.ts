import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  BorrowingTransactionDto, 
  BorrowBookDto, 
  ReturnBookDto, 
  UpdateBorrowingTransactionDto 
} from '../../models/dtos/transaction-dtos';
import { 
  TransactionSummaryUiModel, 
  MemberBorrowingStatusUiModel,
  TransactionDisplayUiModel,
  TransactionFilterUiModel
} from '../../models/ui-models/transaction-ui-models';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiBaseUrl = environment.apiBaseUrl;
  private endpoints = environment.apiEndpoints.borrowing;
  
  // Constants that match backend expectations
  private readonly BORROWING_PERIOD_DAYS = 14;
  private readonly MAX_BOOKS_PER_MEMBER = 5;
  private readonly NOT_RETURNED_DATE = '0001-01-01T00:00:00';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // 1. GET /api/Borrowing - Get all transactions
  getTransactions(filter?: TransactionFilterUiModel): Observable<BorrowingTransactionDto[]> {
    return this.http.get<BorrowingTransactionDto[]>(`${this.apiBaseUrl}${this.endpoints.getAll}`)
      .pipe(
        map(transactions => {
          // Process transactions (add UI properties, fix dates)
          const processedTransactions = this.processTransactionsForDisplay(transactions);
          
          // Apply client-side filtering if filters provided
          return filter ? this.applyFilters(processedTransactions, filter) : processedTransactions;
        }),
        catchError(this.handleError<BorrowingTransactionDto[]>('getTransactions', []))
      );
  }

  // 2. GET /api/Borrowing/{id} - Get transaction by ID
  getTransaction(id: number): Observable<BorrowingTransactionDto> {
    return this.http.get<BorrowingTransactionDto>(`${this.apiBaseUrl}${this.endpoints.getById}${id}`)
      .pipe(
        map(transaction => this.processTransactionForDisplay(transaction)),
        catchError(this.handleError<BorrowingTransactionDto>('getTransaction'))
      );
  }

  // 3. POST /api/Borrowing/borrow - Create a new borrowing
  borrowBook(borrowDto: BorrowBookDto): Observable<BorrowingTransactionDto> {
    // For regular users, enforce today's date
    if (!this.canChangeDate()) {
      borrowDto.borrowDate = new Date().toISOString();
    }
    
    console.log('Borrowing book with data:', borrowDto);
    
    return this.http.post<BorrowingTransactionDto>(`${this.apiBaseUrl}${this.endpoints.borrow}`, borrowDto)
      .pipe(
        tap(response => {
          console.log('Book borrowed successfully:', response);
        }),
        catchError(error => {
          // Extract meaningful backend validation messages
          let errorMessage = 'Failed to borrow book';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            errorMessage = errors.join('. ');
          }
          
          console.error('Error borrowing book:', error);
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // 4. POST /api/Borrowing/return - Return a borrowed book
  returnBook(returnDto: ReturnBookDto): Observable<BorrowingTransactionDto> {
    // For regular users, enforce today's date
    if (!this.canChangeDate()) {
      returnDto.returnDate = new Date().toISOString();
    }
    
    return this.http.post<BorrowingTransactionDto>(`${this.apiBaseUrl}${this.endpoints.return}`, returnDto)
      .pipe(
        catchError(error => {
          // Extract meaningful backend validation messages
          let errorMessage = 'Failed to return book';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            errorMessage = errors.join('. ');
          }
          
          console.error('Error returning book:', error);
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // 5. GET /api/Borrowing/overdue - Get all overdue transactions
  getOverdueTransactions(): Observable<BorrowingTransactionDto[]> {
    return this.http.get<BorrowingTransactionDto[]>(`${this.apiBaseUrl}${this.endpoints.overdue}`)
      .pipe(
        map(transactions => {
          // Mark all as overdue for consistency
          return transactions.map(t => ({
            ...t,
            status: 'Overdue',
            isOverdue: true
          }));
        }),
        catchError(this.handleError<BorrowingTransactionDto[]>('getOverdueTransactions', []))
      );
  }

  // 6. GET /api/Borrowing/member/{memberId} - Get member's transactions
  getMemberTransactions(memberId: number): Observable<BorrowingTransactionDto[]> {
    // Add validation to prevent invalid API calls
    if (!memberId || isNaN(memberId) || memberId <= 0) {
      console.error('Invalid member ID for transaction fetch:', memberId);
      return throwError(() => new Error('Invalid member ID'));
    }
    
    console.log('Fetching transactions for member ID:', memberId);
    
    const url = `${this.apiBaseUrl}${this.endpoints.memberHistory}${memberId}`;
    return this.http.get<BorrowingTransactionDto[]>(url).pipe(
      tap(transactions => console.log(`Fetched ${transactions.length} transactions for member ${memberId}`)),
      catchError(this.handleError<BorrowingTransactionDto[]>('getMemberTransactions', []))
    );
  }

  // DELETE operation is missing from the endpoint list but implemented
  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}${this.endpoints.getById}${id}`)
      .pipe(catchError(this.handleError<void>('deleteTransaction')));
  }

  // Add method for PUT /api/Borrowing/{id} endpoint
  updateTransaction(id: number, updateDto: UpdateBorrowingTransactionDto): Observable<BorrowingTransactionDto> {
    return this.http.put<BorrowingTransactionDto>(`${this.apiBaseUrl}${this.endpoints.getById}${id}`, updateDto)
      .pipe(
        catchError(error => {
          // Extract meaningful backend validation messages
          let errorMessage = 'Failed to update transaction';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            errorMessage = errors.join('. ');
          }
          
          console.error('Error updating transaction:', error);
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // Check if a member can borrow more books based on business rules
  canMemberBorrow(memberId: number): Observable<boolean> {
    return this.getMemberTransactions(memberId).pipe(
      map(transactions => {
        // Check if member has fewer than 5 active borrows
        const activeBorrows = transactions.filter(t => 
          t.status !== 'Returned'
        );
        
        // Check if any are overdue
        const overdueBooks = activeBorrows.filter(t => this.isOverdue(t));
        
        // Can borrow if under limit and no overdue books
        return activeBorrows.length < this.MAX_BOOKS_PER_MEMBER && overdueBooks.length === 0;
      }),
      catchError(error => {
        console.error('Error checking borrowing eligibility:', error);
        return of(false);
      })
    );
  }

  // Check if a member has already borrowed a specific book
  hasAlreadyBorrowedBook(memberId: number, bookId: number): Observable<boolean> {
    return this.getMemberTransactions(memberId).pipe(
      map(transactions => {
        // Check for active borrowing of the same book
        return transactions.some(t => 
          t.bookID === bookId && 
          t.status !== 'Returned'
        );
      }),
      catchError(error => {
        console.error('Error checking if already borrowed:', error);
        return of(false);
      })
    );
  }

  // Get detailed borrowing status for a member
  checkMemberBorrowingStatus(memberId: number, memberName: string = ''): Observable<MemberBorrowingStatusUiModel> {
    return this.getMemberTransactions(memberId).pipe(
      map(transactions => {
        const activeBorrows = transactions.filter(t => t.status !== 'Returned');
        const hasOverdueItems = activeBorrows.some(t => this.isOverdue(t));
        
        // Apply business rules for borrowing eligibility
        const canBorrow = activeBorrows.length < this.MAX_BOOKS_PER_MEMBER && !hasOverdueItems;
        
        let reasonCannotBorrow = '';
        if (activeBorrows.length >= this.MAX_BOOKS_PER_MEMBER) {
          reasonCannotBorrow = `Maximum borrowing limit of ${this.MAX_BOOKS_PER_MEMBER} books reached`;
        } else if (hasOverdueItems) {
          reasonCannotBorrow = 'Has overdue items that must be returned first';
        }
        
        return {
          memberId,
          memberName: memberName,
          currentBorrowings: activeBorrows.length,
          maxAllowedBorrowings: this.MAX_BOOKS_PER_MEMBER,
          hasOverdueItems,
          hasOutstandingFines: false, // Would need a FineService to check this
          canBorrow,
          reasonCannotBorrow: canBorrow ? undefined : reasonCannotBorrow
        };
      }),
      catchError(error => {
        console.error('Error checking member borrowing status:', error);
        return of({
          memberId,
          memberName: memberName,
          currentBorrowings: 0,
          maxAllowedBorrowings: this.MAX_BOOKS_PER_MEMBER,
          hasOverdueItems: false,
          hasOutstandingFines: false,
          canBorrow: false,
          reasonCannotBorrow: 'Error checking borrowing status'
        });
      })
    );
  }

  // Calculate transaction statistics for dashboard
  getTransactionSummary(): Observable<TransactionSummaryUiModel> {
    return this.getTransactions().pipe(
      map(transactions => {
        const activeBorrowings = transactions.filter(t => t.status !== 'Returned').length;
        const overdueItems = transactions.filter(t => this.isOverdue(t)).length;
        const returnedItems = transactions.filter(t => t.status === 'Returned').length;
        
        return {
          totalTransactions: transactions.length,
          activeBorrowings,
          overdueItems,
          returnedItems
        };
      }),
      catchError(error => {
        console.error('Error getting transaction summary:', error);
        return of({
          totalTransactions: 0,
          activeBorrowings: 0,
          overdueItems: 0,
          returnedItems: 0
        });
      })
    );
  }

  // Get only active borrowings
  getBorrowedBooks(): Observable<BorrowingTransactionDto[]> {
    return this.getTransactions().pipe(
      map(transactions => {
        // Filter to only include active/borrowed transactions
        return transactions.filter(t => t.status === 'Borrowed' || t.status === 'Active');
      })
    );
  }

  // Check if a transaction is overdue
  isOverdue(transaction: BorrowingTransactionDto): boolean {
    // If already returned, it's not overdue
    if (transaction.status === 'Returned') return false;
    
    // If the returnDate is not the special "not returned" value, it's returned
    if (transaction.returnDate && 
        transaction.returnDate !== this.NOT_RETURNED_DATE && 
        transaction.returnDate !== '0001-01-01') {
      return false;
    }
    
    const dueDate = this.calculateDueDate(transaction.borrowDate);
    const today = new Date();
    
    // Strip time for consistent date comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  // Calculate due date (BORROWING_PERIOD_DAYS days after borrow date)
  calculateDueDate(borrowDate: string): Date {
    const borrowDateObj = new Date(borrowDate);
    const dueDate = new Date(borrowDateObj);
    dueDate.setDate(dueDate.getDate() + this.BORROWING_PERIOD_DAYS);
    return dueDate;
  }

  // Calculate days overdue for a transaction
  calculateOverdueDays(transaction: BorrowingTransactionDto): number {
    if (transaction.status === 'Returned' || !this.isOverdue(transaction)) {
      return 0;
    }
    
    const today = new Date();
    const dueDate = this.calculateDueDate(transaction.borrowDate);
    
    // Strip time for accurate day calculation
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate potential fine for an overdue transaction
  calculatePotentialFine(transaction: BorrowingTransactionDto): number {
    const overdueDays = this.calculateOverdueDays(transaction);
    
    if (overdueDays <= 0) {
      return 0;
    }
    
    // Base fine: ₹10 per day, capped at ₹300
    const baseFine = Math.min(overdueDays * 10, 300);
    
    // Additional suspension fee of ₹200 if more than 30 days overdue
    const suspensionFee = overdueDays > 30 ? 200 : 0;
    
    return baseFine + suspensionFee;
  }

  // Format date for display
  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    
    // Handle the special "not returned" date
    if (date === this.NOT_RETURNED_DATE || date === '0001-01-01') {
      return 'Not Returned';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Check if current user can change dates (admin/librarian only)
  canChangeDate(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  // Map a DTO to UI model with additional calculated properties
  mapToTransactionDisplayUiModel(
    transactionDto: BorrowingTransactionDto, 
    memberName?: string
  ): TransactionDisplayUiModel {
    // Calculate due date (BORROWING_PERIOD_DAYS days from borrow date)
    const borrowDate = new Date(transactionDto.borrowDate);
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + this.BORROWING_PERIOD_DAYS);
    
    // Determine if returned
    const isReturned = transactionDto.status === 'Returned';
    
    // Handle the special "not returned" date
    const hasReturnDate = transactionDto.returnDate && 
                          transactionDto.returnDate !== this.NOT_RETURNED_DATE &&
                          transactionDto.returnDate !== '0001-01-01';
    
    // Determine if overdue
    const now = new Date();
    const returnDate = hasReturnDate ? new Date(transactionDto.returnDate) : null;
    const isOverdue = !isReturned && !returnDate && now > dueDate;
    
    // Calculate days overdue
    let daysOverdue = 0;
    if (isOverdue) {
      daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    } else if (returnDate && returnDate > dueDate) {
      daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Create the UI model with all required properties
    const model: TransactionDisplayUiModel = {
      // Core DTO properties
      transactionID: transactionDto.transactionID,
      bookID: transactionDto.bookID,
      bookName: transactionDto.bookName,
      memberID: transactionDto.memberID,
      borrowDate: transactionDto.borrowDate,
      returnDate: hasReturnDate ? transactionDto.returnDate : '', // Use empty string instead of null
      status: isReturned ? 'Returned' : (isOverdue ? 'Overdue' : 'Borrowed'),
      
      // UI aliases for compatibility
      id: transactionDto.transactionID,
      bookId: transactionDto.bookID,
      bookTitle: transactionDto.bookName,
      memberId: transactionDto.memberID,
      memberName: memberName,
      
      // Calculated fields
      dueDate: dueDate.toISOString().split('T')[0],
      isOverdue: isOverdue,
      isReturned: isReturned,
      daysOverdue: daysOverdue,
      
      // Formatted fields
      formattedBorrowDate: this.formatDate(transactionDto.borrowDate),
      formattedDueDate: this.formatDate(dueDate.toISOString().split('T')[0]),
      formattedReturnDate: hasReturnDate ? this.formatDate(transactionDto.returnDate) : 'Not Returned',
      
      // Status color for UI
      statusColor: isOverdue ? 'warn' : (isReturned ? 'accent' : 'primary')
    };
    
    return model;
  }

  // Private Methods

  // Process a single transaction for display
  private processTransactionForDisplay(transaction: BorrowingTransactionDto): BorrowingTransactionDto {
    const isOverdue = this.isOverdue(transaction);
    const daysOverdue = this.calculateOverdueDays(transaction);
    const estimatedFine = this.calculatePotentialFine(transaction);
    
    // Update status based on our business logic
    let status = transaction.status;
    if (status !== 'Returned' && isOverdue) {
      status = 'Overdue';
    } else if (status !== 'Returned') {
      status = 'Borrowed';
    }
    
    // Handle the special "not returned" date
    let returnDate = transaction.returnDate;
    if (returnDate === this.NOT_RETURNED_DATE || returnDate === '0001-01-01') {
      // Cast to any to bypass TypeScript's type checking for this property assignment
      (transaction as any).returnDate = ''; // Use empty string instead of null
    }
    
    return {
      ...transaction,
      status,
      overdueStatus: isOverdue,
      daysOverdue,
      estimatedFine
    } as BorrowingTransactionDto;
  }

  // Process a batch of transactions for display
  private processTransactionsForDisplay(transactions: BorrowingTransactionDto[]): BorrowingTransactionDto[] {
    return transactions.map(transaction => this.processTransactionForDisplay(transaction));
  }

  // Apply client-side filters to transactions
  private applyFilters(transactions: BorrowingTransactionDto[], filter: TransactionFilterUiModel): BorrowingTransactionDto[] {
    return transactions.filter(transaction => {
      // Filter by status
      if (filter.status && transaction.status !== filter.status) {
        return false;
      }
      
      // Filter by book title
      if (filter.bookTitle && transaction.bookName && 
          !transaction.bookName.toLowerCase().includes(filter.bookTitle.toLowerCase())) {
        return false;
      }
      
      // Filter by member name (if available)
      // Since memberName is not in BorrowingTransactionDto, we need to cast to any or check differently
      if (filter.memberName && 
          // Use a type assertion for the extended transaction that might have memberName
          (transaction as any).memberName && 
          !(transaction as any).memberName.toLowerCase().includes(filter.memberName.toLowerCase())) {
        return false;
      }
      
      // Filter by date range - from date
      if (filter.fromDate) {
        const fromDate = new Date(filter.fromDate);
        const borrowDate = new Date(transaction.borrowDate);
        if (borrowDate < fromDate) return false;
      }
      
      // Filter by date range - to date
      if (filter.toDate) {
        const toDate = new Date(filter.toDate);
        const borrowDate = new Date(transaction.borrowDate);
        if (borrowDate > toDate) return false;
      }
      
      // Only show overdue items
      if (filter.overdueOnly && !this.isOverdue(transaction)) {
        return false;
      }
      
      // Include/exclude returned items
      if (filter.includeReturned === false && transaction.status === 'Returned') {
        return false;
      }
      
      return true;
    });
  }

  // Unified error handler
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} Error:`, error);
      
      // Log additional information for debugging
      if (operation === 'getMemberTransactions') {
        console.error('Member ID issue in transaction service. Details:', {
          error: error,
          url: error.url,
          statusCode: error.status,
          statusText: error.statusText
        });
      }
      
      return throwError(() => ({
        message: error.error?.message || `${operation} failed`,
        original: error
      }));
    };
  }
}