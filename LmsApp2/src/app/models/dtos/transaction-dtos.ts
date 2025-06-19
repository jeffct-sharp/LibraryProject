/**
 * Borrowing Transaction related DTOs
 */

// These DTOs are correctly aligned with the backend implementation
export interface BorrowingTransactionDto {
  transactionID: number;
  bookID: number;
  bookName: string;
  memberID: number;
  borrowDate: string;
  returnDate: string;
  status: string;
}

export interface BorrowBookDto {
  bookID: number;
  memberID: number;
  borrowDate: string;
}

export interface UpdateBorrowingTransactionDto {
  transactionID: number;
  bookID: number;
  memberID: number;
  borrowDate: string;
  returnDate: string;
  status: string;
}

export interface ReturnBookDto {
  transactionID: number;
  returnDate: string;
}
