import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token from session storage directly to avoid circular dependencies
    const token = this.getTokenFromStorage();
    
    if (token) {
      // Clone the request and add the authorization header
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Pass the cloned request with the token to the next handler
      return next.handle(authReq);
    }
    
    // If no token, pass the original request
    return next.handle(request);
  }
  
  // Helper method to get token directly from storage
  private getTokenFromStorage(): string | null {
    const authData = sessionStorage.getItem('auth');
    if (authData) {
      try {
        const parsedData = JSON.parse(authData);
        return parsedData.token || null;
      } catch (error) {
        console.error('Error parsing auth data:', error);
        return null;
      }
    }
    return null;
  }
}
