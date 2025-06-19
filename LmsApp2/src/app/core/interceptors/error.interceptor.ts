import { Injectable } from '@angular/core';
import { 
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Log the error for debugging
        console.log('HTTP Error:', error);
        
        // Add more detailed error logging for Bad Request (400) errors
        if (error.status === 400) {
          console.log('Bad Request Details:', error.error);
          
          // If there's validation errors in the response, log them
          if (error.error && error.error.errors) {
            console.log('Validation Errors:', error.error.errors);
          }
        }
        
        let errorMessage = 'An unknown error occurred';
        
        // Check if it's a login request - handle differently to avoid redirect loops
        const isLoginRequest = request.url.includes('/api/Auth/login');
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Server-side error
          switch (error.status) {
            case 400:
              errorMessage = error.error?.message || 'Bad request';
              break;
            case 401:
              errorMessage = 'Unauthorized. Please log in again.';
              // Only redirect to login for 401 errors on non-login requests
              if (!isLoginRequest) {
                this.authService.logout();
                this.router.navigate(['/auth/login']);
              }
              break;
            case 403:
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            default:
              errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
          }
        }
        
        // Log the error for debugging purposes
        console.log('HTTP Error:', errorMessage, error);
        
        // Return an observable with a user-facing error message
        return throwError(() => ({ message: errorMessage, original: error }));
      })
    );
  }
}
