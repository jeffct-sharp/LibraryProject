import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const currentUser = this.authService.currentUserValue;
    const requiredRoles = route.data['roles'] as string[];
    if (currentUser) {
      if (requiredRoles && (!currentUser.roles || !requiredRoles.some(r => currentUser.roles.includes(r)))) {
        this.snackBar.open('You do not have permission to access this page.', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
        return false;
      }
      return true;
    }
    this.snackBar.open('You need to log in to access this page.', 'Close', { duration: 3000 });
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }
}
