import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
// Updated imports to use new model locations
import { LoginMemberDto, TokenResponseDto } from '../../models/dtos/auth-dtos';
import { MemberResponseDto } from '../../models/dtos/member-dtos';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberCreateUiModel } from '../../models/ui-models/member-ui-models';

interface AuthUser {
  id: number;
  username: string;
  role: string;
  token: string;
  memberId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl + '/api/Auth';
  private memberApiUrl = environment.apiBaseUrl + '/api/Member';
  private authStateSubject = new BehaviorSubject<TokenResponseDto | null>(this.getSessionUser());
  public authState$ = this.authStateSubject.asObservable();

  private authStateChangedSubject = new BehaviorSubject<boolean>(false);
  public authStateChanged = this.authStateChangedSubject.asObservable();

  private _memberId: number | null = null;

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private router: Router) {}

  private getSessionUser(): TokenResponseDto | null {
    const data = sessionStorage.getItem('auth');
    return data ? JSON.parse(data) : null;
  }

  private setSessionUser(user: TokenResponseDto) {
    sessionStorage.setItem('auth', JSON.stringify(user));
    this.authStateSubject.next(user);
  }

  private clearSession() {
    sessionStorage.removeItem('auth');
    this.authStateSubject.next(null);
  }

  // Store member details in sessionStorage
  setCurrentMember(member: MemberResponseDto): void {
    sessionStorage.setItem('currentMember', JSON.stringify(member));
  }

  // Retrieve member details from sessionStorage
  getCurrentMember(): MemberResponseDto | null {
    const data = sessionStorage.getItem('currentMember');
    return data ? JSON.parse(data) : null;
  }

  login(loginDto: LoginMemberDto): Observable<TokenResponseDto | null> {
    return this.http.post<TokenResponseDto>(`${this.apiUrl}/login`, loginDto).pipe(
      map(response => {
        if (!response || !response.token) {
          this.snackBar.open('Login failed: Invalid server response.', 'Close', { duration: 5000 });
          console.error('Login response missing token:', response);
          return null;
        }
        
        // Store token first
        this.storeToken(response);
        
        // After we have the token, get member details using the token
        if (response.email) {
          // Don't return the result of getMemberByEmail - just initiate the call
          this.getMemberByEmail(response.email).pipe(
            catchError(error => {
              console.warn('Could not fetch member details:', error);
              return of(null); // Continue even if member fetch fails
            })
          ).subscribe(member => {
            if (member) {
              response.member = member;
              response.memberId = member.memberID;
              this.setSessionUser(response); // Update with member details
              this.setCurrentMember(member);
              this._memberId = member.memberID;
            }
            // Explicitly trigger the auth state changed subject - IMPORTANT for UI updates
            this.authStateChangedSubject.next(true);
            
          });
        }
        
        // Force the authStateSubject to emit an event right away with basic auth data
        this.authStateSubject.next(response);
        
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        
        // Add page reload after a short delay to ensure state is properly updated
        setTimeout(() => {
          window.location.reload();
        }, 300);
        
        return response;
      }),
      catchError(error => {
        console.error('Login error:', error);
        this.snackBar.open('Login failed: ' + (error.error?.message || 'Invalid credentials'), 'Close', { duration: 5000 });
        return of(null);
      })
    );
  }

  register(registerDto: MemberCreateUiModel): Observable<TokenResponseDto | null> {
    return this.http.post<TokenResponseDto>(`${this.apiUrl}/register`, registerDto).pipe(
      map(response => {
        if (!response || !response.token) {
          this.snackBar.open('Registration failed: Invalid server response.', 'Close', { duration: 5000 });
          console.error('Registration response missing token:', response);
          return null;
        }
        
        // Store token first
        this.storeToken(response);
        
        // After we have the token, get member details
        if (response.email) {
          // Don't return the result of getMemberByEmail - just initiate the call
          this.getMemberByEmail(response.email).pipe(
            catchError(error => {
              console.warn('Could not fetch member details:', error);
              return of(null); // Continue even if member fetch fails
            })
          ).subscribe(member => {
            if (member) {
              response.member = member;
              response.memberId = member.memberID;
              this.setSessionUser(response); // Update with member details
              this.setCurrentMember(member);
              this._memberId = member.memberID;
            }
            this.authStateChangedSubject.next(true);
          });
        }
        
        this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
        return response;
      }),
      catchError(error => {
        console.error('Registration error:', error);
        this.snackBar.open('Registration failed: ' + (error.error?.message || 'An error occurred'), 'Close', { duration: 5000 });
        return of(null);
      })
    );
  }

  getMemberByEmail(email: string): Observable<MemberResponseDto> {
    // Use GET with email as query parameter
    return this.http.get<MemberResponseDto>(`${this.memberApiUrl}/by-email?email=${encodeURIComponent(email)}`);
  }

  logout(): void {
    this.clearSession();
    sessionStorage.removeItem('currentMember'); // Clear member details
    this._memberId = null; // Reset _memberId
    this.snackBar.open('Logged out successfully.', 'Close', { duration: 2000 });
    this.authStateChangedSubject.next(false);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    const sessionUser = this.getSessionUser();
    return sessionUser?.token || null;
  }

  getUserRoles(): string[] {
    return this.getSessionUser()?.roles || [];
  }

  getUserEmail(): string | null {
    return this.getSessionUser()?.email || null;
  }

  get currentUserValue(): TokenResponseDto | null {
    return this.getSessionUser();
  }

  get memberId(): number | null {
    // First try to get from the member object in the token response
    const userData = this.getSessionUser();
    if (userData && userData.member && userData.member.memberID) {
      const id = Number(userData.member.memberID);
      if (!isNaN(id) && id > 0) return id;
    }
    
    // If not found in the token response, try the stored member details
    const storedMember = this.getCurrentMember();
    if (storedMember && storedMember.memberID) {
      const id = Number(storedMember.memberID);
      if (!isNaN(id) && id > 0) return id;
    }
    
    // If still not found, check if we have a memberId directly in the token response
    if (userData && userData.memberId) {
      const id = Number(userData.memberId);
      if (!isNaN(id) && id > 0) return id;
    }
    
    // If all else fails, return null
    return null;
  }

  // Add this method for backward compatibility with components expecting getMemberId()
  getMemberId(): number | null {
    return this.memberId;
  }

  // Add this method to check if a valid member ID exists
  hasMemberId(): boolean {
    return this.memberId !== null && this.memberId > 0;
  }

  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles && roles.includes(role);
  }

  // Add this method for compatibility
  getUsernameFromStorage(): string {
    const user = this.getSessionUser();
    return user?.email || 'User';
  }

  // Add this public method to get the user's email
  getCurrentUserEmail(): string | null {
    const user = this.getSessionUser();
    return user?.email || null;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  // Helper method to store token initially
  private storeToken(response: TokenResponseDto): void {
    // Store token in session storage
    sessionStorage.setItem('auth', JSON.stringify(response));
    this.authStateSubject.next(response);
  }
}
