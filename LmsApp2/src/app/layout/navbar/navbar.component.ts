import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { NotificationService } from '../../features/notifications/notification.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  isLoggedIn = false;
  username = '';
  userRole = '';
  unreadNotifications = 0;
  
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Subscribe to auth state changes - using the authState$ observable
    this.authSubscription = this.authService.authState$.subscribe(userData => {
      this.isLoggedIn = !!userData && !!userData.token;
      
      if (userData && userData.token) {
        // Get username either from member data or email
        this.username = userData.member?.name || userData.email || 'User';
        this.userRole = userData.roles?.[0] || 'Member';
        this.loadNotificationCount();
      } else {
        this.username = '';
        this.userRole = '';
        this.unreadNotifications = 0;
      }
      
      // Debug logs
      console.log('Navbar auth state updated:', { isLoggedIn: this.isLoggedIn, username: this.username, role: this.userRole });
    });
    
    // Also subscribe to explicit auth state changes for more reliable updates
    this.authService.authStateChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        const userData = this.authService.currentUserValue;
        if (userData) {
          this.isLoggedIn = true;
          this.username = userData.member?.name || userData.email || 'User';
          this.userRole = userData.roles?.[0] || 'Member';
          this.loadNotificationCount();
        }
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  loadNotificationCount(): void {
    const memberId = this.authService.getCurrentUser()?.memberId;
    if (memberId) {
      this.notificationService.getMemberNotifications(memberId).subscribe({
        next: (notifications) => {
          // Count notifications from the last 24 hours as "unread"
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          this.unreadNotifications = notifications.filter(n => {
            const notificationDate = new Date(n.dateSent);
            return notificationDate >= yesterday;
          }).length;
        },
        error: () => {
          // Silently fail - not critical
          this.unreadNotifications = 0;
        }
      });
    }
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
  
  goToMyNotifications(): void {
    this.router.navigate(['/notifications/my-notifications']);
  }
  
  goToProfile(): void {
    // Navigate to the member profile page
    this.router.navigate(['/members/profile']);
  }
  
  // Role-based navigation guards
  canAccessMembers(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Librarian';
  }
  
  canAccessTransactions(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Librarian';
  }
}