/**
 * Fine Management UI Models
 * These extend backend DTOs with additional frontend-specific properties
 */

import { FineDetailsDto } from '../dtos/fine-dtos';

// UI model for fine filtering
export interface FineFilterUiModel {
  memberName?: string;
  status?: string;
  fromDate?: Date | string | null;
  toDate?: Date | string | null;
  minAmount?: string | number;
  maxAmount?: string | number;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

// UI model for fine summary statistics
export interface FineSummaryUiModel {
  totalFines: number;
  pendingFines: number;
  paidFines: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  averageAmount: number;
  // Keep backward compatibility
  averageFineAmount?: number;
}

// UI model for fine display with additional properties
export interface FineDisplayUiModel extends FineDetailsDto {
  memberName?: string;
  formattedAmount?: string;
  formattedDate?: string;
  formattedTransactionDate?: string; // Add this field to match what's used in the service
  paymentDate?: string;
  formattedPaymentDate?: string;
  bookName?: string;
  bookID?: number;
  transactionID?: number;
  daysOverdue?: number;
}

// UI model for fine payment with payment method
export interface FinePaymentUiModel {
  fineID: number;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  comments?: string;
  receiptNumber?: string;
  notes?: string;
}

// UI model for overdue fine application result
export interface OverdueFineApplicationResultUiModel {
  finesCreated: number;
  totalAmount: number;
  message?: string;
  successRate?: number;
  affectedMembers?: number;
  appliedFines?: number;
  members?: number;
  books?: number;
  errors?: string[];
}

// List of available payment methods
export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Net Banking',
  'Wallet'
];

// Utility function to format currency for display
export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
