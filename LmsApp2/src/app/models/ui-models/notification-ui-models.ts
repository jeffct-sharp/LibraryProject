/**
 * UI-specific models for notifications feature
 */

export interface NotificationFilterUiModel {
  memberId?: number;
  memberName?: string;
  fromDate?: Date | string;
  toDate?: Date | string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface NotificationDisplayUiModel {
  id: number;
  memberId: number;
  memberName?: string;
  message: string;
  date: Date | string;
  timeAgo?: string;
  isRead?: boolean;
}

export interface NotificationSummaryUiModel {
  total: number;
  recent: number;
}
