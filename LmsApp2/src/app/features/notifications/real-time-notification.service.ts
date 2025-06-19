import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationDetailsDto } from '../../models/dtos/notification-dtos';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class RealTimeNotificationService {
  private notificationsSubject = new BehaviorSubject<NotificationDetailsDto[]>([]);
  private countSubject = new BehaviorSubject<number>(0);

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    // Initialize connection to real-time notification source
    this.setupRealTimeConnection();
  }

  // Get observable notifications
  get notifications$(): Observable<NotificationDetailsDto[]> {
    return this.notificationsSubject.asObservable();
  }

  // Get observable count
  get count$(): Observable<number> {
    return this.countSubject.asObservable();
  }

  // Setup connection to notification source
  private setupRealTimeConnection(): void {
    // For prototype, we'll simulate real-time updates
    // In a real application, this would connect to SignalR or WebSocket
    
    // Check for new notifications every 30 seconds
    setInterval(() => {
      this.checkForNewNotifications();
    }, 30000);
    
    // Initial check
    this.checkForNewNotifications();
  }

  // Simulate checking for new notifications
  private checkForNewNotifications(): void {
    // In a real app, this would come from SignalR
    // For now, we'll just keep the existing notifications
    const currentNotifications = this.notificationsSubject.getValue();
    this.updateCount(currentNotifications);
  }

  // Update notifications with new data
  updateNotifications(notifications: NotificationDetailsDto[]): void {
    this.notificationsSubject.next(notifications);
    this.updateCount(notifications);
  }

  // Add a new notification to the list
  addNotification(notification: NotificationDetailsDto): void {
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next([notification, ...current]);
    this.updateCount([notification, ...current]);
  }

  // Remove a notification from the list
  removeNotification(notificationId: number): void {
    const current = this.notificationsSubject.getValue();
    const updated = current.filter(n => n.notificationID !== notificationId);
    this.notificationsSubject.next(updated);
    this.updateCount(updated);
  }

  // Update the count
  private updateCount(notifications: NotificationDetailsDto[]): void {
    this.countSubject.next(notifications.length);
  }

  // Method to clear all notifications
  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.countSubject.next(0);
  }

  // Add this method for compatibility with navbar component
  getMemberNotifications(memberId: number): Observable<NotificationDetailsDto[]> {
    return this.notificationService.getMemberNotifications(memberId);
  }
}
