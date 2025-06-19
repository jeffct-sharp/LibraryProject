import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateNotificationDto, NotificationDetailsDto } from '../../models/dtos/notification-dtos';
import { NotificationFilterUiModel, NotificationSummaryUiModel } from '../../models/ui-models/notification-ui-models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiBaseUrl = environment.apiBaseUrl;
  private endpoints = environment.apiEndpoints.notifications;

  constructor(private http: HttpClient) { }

  // Get all notifications (Admin/Librarian only)
  getAllNotifications(filter?: NotificationFilterUiModel): Observable<NotificationDetailsDto[]> {
    let params = new HttpParams();
    
    if (filter) {
      Object.keys(filter).forEach(key => {
        const value = filter[key as keyof NotificationFilterUiModel];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    
    return this.http.get<NotificationDetailsDto[]>(`${this.apiBaseUrl}${this.endpoints.getAll}`, { params })
      .pipe(catchError(this.handleError));
  }

  // Get single notification
  getNotification(id: number): Observable<NotificationDetailsDto> {
    return this.http.get<NotificationDetailsDto>(`${this.apiBaseUrl}${this.endpoints.getById}${id}`)
      .pipe(catchError(this.handleError));
  }

  // Create notification (Admin/Librarian only)
  createNotification(notification: CreateNotificationDto): Observable<NotificationDetailsDto> {
    return this.http.post<NotificationDetailsDto>(`${this.apiBaseUrl}${this.endpoints.create}`, notification)
      .pipe(catchError(this.handleError));
  }

  // Delete notification
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiBaseUrl}${this.endpoints.delete}${id}`)
      .pipe(catchError(this.handleError));
  }

  // Get notifications for a specific member
  getMemberNotifications(memberId: number): Observable<NotificationDetailsDto[]> {
    return this.http.get<NotificationDetailsDto[]>(`${this.apiBaseUrl}${this.endpoints.getMemberNotifications}${memberId}`)
      .pipe(catchError(this.handleError));
  }

  // Send notifications for overdue books (Admin/Librarian only)
  notifyOverdueBooks(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${this.endpoints.notifyOverdueBooks}`, {})
      .pipe(catchError(this.handleError));
  }

  // Send notification for fine payment (Admin/Librarian only)
  notifyFinePayment(fineId: number): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${this.endpoints.notifyFinePayment}${fineId}`, {})
      .pipe(catchError(this.handleError));
  }

  // Notify about membership status change
  notifyMembershipStatus(memberId: number, newStatus: string): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${this.endpoints.notifyMembershipStatus}${memberId}/${newStatus}`, {})
      .pipe(catchError(this.handleError));
  }

  // Perform periodic checks (Admin/Librarian only)
  performPeriodicChecks(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}${this.endpoints.performPeriodicChecks}`, {})
      .pipe(catchError(this.handleError));
  }
  
  // Get notification summary
  getNotificationSummary(): Observable<NotificationSummaryUiModel> {
    return this.getAllNotifications().pipe(
      map(notifications => {
        const total = notifications.length;
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recent = notifications.filter(n => {
          const notificationDate = new Date(n.dateSent);
          return notificationDate >= twentyFourHoursAgo;
        }).length;
        
        return { total, recent };
      }),
      catchError(error => {
        console.error('Error getting notification summary:', error);
        return throwError(() => error);
      })
    );
  }
  
  // Format date for display
  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString() + ' ' + 
             new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (e) {
      return 'Invalid Date';
    }
  }
  
  // Get timeago string for notification display
  getTimeAgo(date: string): string {
    if (!date) return '';
    
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHour / 24);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return this.formatDate(date);
  }
  
  // Notify about due books
  notifyDueBooks(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/api/Notifications/notify-due-books`, {})
      .pipe(catchError(this.handleError));
  }
  
  // Error handling
  private handleError(error: any) {
    let errorMessage = 'An error occurred in NotificationService';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
    }
    
    console.error(errorMessage, error);
    return throwError(() => ({ message: errorMessage, original: error }));
  }
}
