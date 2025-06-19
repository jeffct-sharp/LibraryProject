/**
 * UI-specific models for transactions feature
 */

// For filtering transactions in the UI
import { BorrowingTransactionDto } from '../dtos/transaction-dtos';
export interface TransactionFilterUiModel {
  bookTitle?: string;
  memberName?: string;
  status?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  includeReturned?: boolean;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

// Statistics for dashboard
export interface TransactionSummaryUiModel {
  totalTransactions: number;
  activeBorrowings: number;
  overdueItems: number;
  returnedItems: number;
}

// Status model for checking if a member can borrow
export interface MemberBorrowingStatusUiModel {
  memberId: number;
  memberName: string;
  currentBorrowings: number;
  maxAllowedBorrowings: number;
  hasOverdueItems: boolean;
  hasOutstandingFines: boolean;
  canBorrow: boolean;
  reasonCannotBorrow?: string;
}

// For paginated results
export interface PaginatedResponseUiModel<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Extended transaction with additional UI-specific properties
export interface TransactionDisplayUiModel {
  // Core DTO properties
  transactionID: number;
  bookID: number;
  bookName: string;
  memberID: number;
  borrowDate: string;
  returnDate: string | null; // Changed to allow null for unreturned books
  status: string;
  
  // UI-specific properties
  id?: number; // Alias for transactionID
  bookId?: number; // Alias for bookID
  bookTitle?: string; // Alias for bookName
  memberId?: number; // Alias for memberID
  memberName?: string; // UI-only field populated from member service
  dueDate?: string; // Calculated field (borrowDate + loan period)
  isOverdue?: boolean; // Calculated field
  isReturned?: boolean; // Calculated field
  daysOverdue?: number; // Calculated field
  fineAmount?: number; // Associated fine amount if any
  
  // Formatted display fields
  formattedBorrowDate?: string;
  formattedDueDate?: string;
  formattedReturnDate?: string;
  statusColor?: string;
}

// Model for extending due date (renewing book)
export interface ExtendBorrowingUiModel {
  transactionID: number;
  newDueDate: Date;
  reason?: string;
}

// Model for returning a book
export interface ReturnBookUiModel {
  transactionId: number;
  bookTitle: string;
  memberName: string;
  borrowDate: Date | string;
  dueDate: Date | string;
  isOverdue: boolean;
  daysOverdue: number;
  fineAmount: number;
  returnDate: Date | string;
  paymentRequired: boolean;
}

// Model for borrowing a book
export interface BorrowBookUiModel {
  bookId: number;
  bookTitle: string;
  memberId: number;
  memberName: string;
  borrowDate: Date | string;
  dueDate: Date | string;
  loanPeriodDays: number;
}
