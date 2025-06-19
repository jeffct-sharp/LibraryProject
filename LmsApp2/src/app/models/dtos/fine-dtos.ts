/**
 * Fine Management related DTOs
 */

export interface FineDetailsDto {
  fineID: number;
  memberID: number;
  amount: number;
  status: string;
  transactionDate: string; // Date of fine creation or payment
}

export interface CreateFineDto {
  memberID: number;
  amount: number;
  status: string;  // 'Pending' or 'Paid'
  transactionDate: string; // ISO date format
}

export interface UpdateFineDto {
  fineID: number;
  memberID: number;
  amount: number;
  status: string;
  transactionDate: string;
}

// DTO for paying a fine
export interface PayFineDto {
  fineID: number;
  amount: number;
}
