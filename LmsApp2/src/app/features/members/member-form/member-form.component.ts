import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberService } from '../member.service';
import { MemberResponseDto, UpdateMemberDto } from '../../../models/dtos/member-dtos';
import { MemberCreateUiModel, MemberFormStateUiModel } from '../../../models/ui-models/member-ui-models';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';

@Component({
  selector: 'app-member-form',
  templateUrl: './member-form.component.html',
  styleUrls: ['./member-form.component.scss']
})
export class MemberFormComponent implements OnInit {
  memberForm!: FormGroup;
  isEditMode = false;
  memberId: number | null = null;
  loading = false;
  error: string | null = null;
  showPassword = false;
  availableRoles: string[] = ['User', 'Librarian', 'Admin'];
  formState: MemberFormStateUiModel = {
    isSubmitting: false,
    errors: {},
    isDirty: false
  };
  
  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {}

  ngOnInit(): void {
    // Initialize form with validation
    this.initializeForm();
    
    // Check if in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.memberId = +id;
      this.isEditMode = true;
      this.loadMemberData();
    }
    
    // Handle permissions - only admins can change roles, regular users can only edit themselves
    this.handlePermissions();
  }
  
  private initializeForm(): void {
    this.memberForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(8)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s-]{10,15}$/)]],
      address: [''],
      role: ['User', this.isEditMode ? [] : [Validators.required]]
    });
    
    // Disable email field in edit mode as it can't be changed
    if (this.isEditMode) {
      this.memberForm.get('email')?.disable();
    }
    
    this.memberForm.valueChanges.subscribe(() => {
      this.formState.isDirty = this.memberForm.dirty;
    });
  }
  
  private loadMemberData(): void {
    if (!this.memberId) return;
    
    this.loading = true;
    this.memberService.getMember(this.memberId).subscribe({
      next: (member: MemberResponseDto) => {
        // Remove password field in edit mode
        if (this.memberForm.get('password')) {
          this.memberForm.removeControl('password');
        }
        
        // Patch form with member data
        this.memberForm.patchValue({
          name: member.name,
          email: member.email,
          phone: member.phone,
          address: member.address || '',
          // Set role if available, otherwise default to 'User'
          role: 'User'
        });
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  get canAccessMembers(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }
  
  private handlePermissions(): void {
    // Check if user has permission to access this form
    const currentUserId = this.authService.memberId;
    
    // If editing and not admin/librarian, ensure user can only edit their own profile
    if (this.isEditMode && 
        !this.authService.hasRole('Admin') && 
        !this.authService.hasRole('Librarian') && 
        this.memberId !== currentUserId) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    // If creating new member and not admin/librarian, deny access
    if (!this.isEditMode && 
        !this.authService.hasRole('Admin') && 
        !this.authService.hasRole('Librarian')) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    // Handle role field visibility - only admins can change roles
    if (!this.authService.hasRole('Admin')) {
      this.memberForm.get('role')?.disable();
    }
  }

  onSubmit(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    if (this.isEditMode) {
      this.updateMember();
    } else {
      this.createMember();
    }
  }
  
  private createMember(): void {
    const formValues = this.memberForm.value;
    
    const createModel: MemberCreateUiModel = {
      name: formValues.name,
      email: formValues.email,
      password: formValues.password,
      phone: formValues.phone,
      address: formValues.address || undefined,
      role: formValues.role
    };
    
    this.memberService.createMember(createModel).subscribe({
      next: (member) => {
        this.snackBar.open('Member created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/members']);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create member. Please try again.';
        this.loading = false;
      }
    });
  }
  
  private updateMember(): void {
    if (!this.memberId) return;
    
    const formValues = this.memberForm.getRawValue(); // Get values including disabled fields
    
    const updateDto: UpdateMemberDto = {
      memberID: this.memberId,
      name: formValues.name,
      phone: formValues.phone,
      address: formValues.address
    };
    
    this.memberService.updateMember(updateDto).subscribe({
      next: (member) => {
        this.snackBar.open('Member updated successfully!', 'Close', { duration: 3000 });
        
        // Navigate based on user role
        if (this.authService.hasRole('Admin') || this.authService.hasRole('Librarian')) {
          this.router.navigate(['/members']);
        } else {
          this.router.navigate(['/members/profile']);
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update member. Please try again.';
        this.loading = false;
      }
    });
  }
  
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  
  resetForm(): void {
    if (this.isEditMode) {
      this.loadMemberData();
    } else {
      this.memberForm.reset({
        role: 'User'
      });
    }
  }
  
  canChangeRole(): boolean {
    return this.authService.hasRole('Admin') && !this.memberForm.get('role')?.disabled;
  }
  
  // Form validation helpers
  get f() { 
    return this.memberForm.controls; 
  }
  
  hasError(controlName: string, errorName: string): boolean {
    return this.memberForm.get(controlName)?.hasError(errorName) || false;
  }
}