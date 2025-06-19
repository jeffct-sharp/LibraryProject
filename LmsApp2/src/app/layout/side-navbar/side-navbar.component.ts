import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';

@Component({
  selector: 'app-side-navbar',
  templateUrl: './side-navbar.component.html',
  styleUrls: ['./side-navbar.component.scss']
})
export class SideNavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userRole = '';
  username = '';
  
  // Add property to track open dropdowns
  openDropdowns: { [key: string]: boolean } = {
    transactions: false
  };
  
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Subscribe to auth state using authState$ (TokenResponseDto)
    this.authSubscription = this.authService.authState$.subscribe(userData => {
      this.isLoggedIn = !!userData && !!userData.token;
      
      if (userData && userData.token) {
        this.userRole = userData.roles?.[0] || 'Member';
        this.username = userData.member?.name || userData.email || 'User';
      } else {
        this.userRole = '';
        this.username = '';
      }
      
      // Debug logs
      console.log('Sidenav auth state updated:', { isLoggedIn: this.isLoggedIn, username: this.username, role: this.userRole });
    });
    
    // Also subscribe to explicit auth state changes
    this.authService.authStateChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        const userData = this.authService.currentUserValue;
        if (userData) {
          this.isLoggedIn = true;
          this.username = userData.member?.name || userData.email || 'User';
          this.userRole = userData.roles?.[0] || 'Member';
        }
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  hasRole(allowedRoles: string[]): boolean {
    if (!this.isLoggedIn) return false;
    return allowedRoles.includes(this.userRole);
  }
  
  // Add methods to handle dropdown toggling
  toggleDropdown(name: string): void {
    this.openDropdowns[name] = !this.openDropdowns[name];
  }
  
  isDropdownOpen(name: string): boolean {
    return this.openDropdowns[name] || false;
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  // Add a helper method to safely get the member ID
  getMemberId(): number {
    const userData = this.authService.currentUserValue;
    if (userData && userData.member && userData.member.memberID) {
      const memberId = userData.member.memberID;
      if (!isNaN(Number(memberId))) {
        return Number(memberId);
      }
    }
    return 0;
  }

  // Add a helper method to check if user has a valid member ID
  userHasMemberId(): boolean {
    return this.getMemberId() > 0;
  }
}
