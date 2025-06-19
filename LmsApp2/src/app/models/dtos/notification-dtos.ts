/**
 * Notification related DTOs
 */

export interface CreateNotificationDto {
  memberID: number;       // Required
  message: string;        // Required, max 500 chars
  dateSent: string;       // ISO date format with time, Required
}

export interface NotificationDetailsDto {
  notificationID: number;
  memberID: number;
  message: string;
  dateSent: string;      // ISO date format with time
}
