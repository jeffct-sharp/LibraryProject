import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { LoginMemberDto } from '../../../models/dtos/auth-dtos';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  hide = true;
  submitted: boolean = false;
  error: string | null = null;
  success: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  get f() { return this.loginForm.controls; }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.error = null;
    
    const loginData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };
    
    // Authenticate to get the token
    this.authService.login(loginData).subscribe({
      next: (response) => {
        if (response) {
          this.success = true;
          this.loading = false;
          
          // Navigate to home page after successful login
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1000);
        } else {
          this.error = 'Login failed. Please check your credentials.';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = err.message || 'Login failed. Please check your credentials.';
        this.loading = false;
      }
    });
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
  
  navigateToHome(): void {
    this.router.navigate(['/']);
  }
}
