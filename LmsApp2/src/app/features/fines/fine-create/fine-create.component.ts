import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { FineService } from '../fine.service';
import { MemberService } from '../../members/member.service';
import { AuthService } from '../../auth/auth.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { CreateFineDto, FineDetailsDto, UpdateFineDto } from '../../../models/dtos/fine-dtos';

@Component({
  selector: 'app-fine-create',
  templateUrl: './fine-create.component.html',
  styleUrls: ['./fine-create.component.css']
})
export class FineCreateComponent implements OnInit, OnDestroy {
  fineForm!: FormGroup;
  loading = false;
  success = false;
  error: string | null = null;
  
  // Member search
  memberSearchResults: MemberResponseDto[] = [];
  selectedMember: MemberResponseDto | null = null;
  
  // Mode handling
  isEditMode = false;
  fineId: number | null = null;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private fineService: FineService,
    private memberService: MemberService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Only admins can create/edit fines
    if (!this.authService.hasRole('Admin')) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    // Check if we're in edit mode
    this.fineId = Number(this.route.snapshot.paramMap.get('id'));
    this.isEditMode = !!this.fineId && !isNaN(this.fineId);
    
    this.initForm();
    this.setupMemberSearch();
    
    // If in edit mode, load the fine data
    if (this.isEditMode && this.fineId) {
      this.loadFineData(this.fineId);
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadFineData(fineId: number): void {
    this.loading = true;
    this.fineService.getFineById(fineId).subscribe({
      next: (fine) => {
        // Load member data first
        this.memberService.getMember(fine.memberID).subscribe({
          next: (member) => {
            this.selectedMember = member;
            
            // Now patch the form with fine data
            const formattedDate = fine.transactionDate ? 
              new Date(fine.transactionDate).toISOString().split('T')[0] : null;
              
            this.fineForm.patchValue({
              memberId: fine.memberID,
              memberSearch: member,
              amount: fine.amount,
              status: fine.status,
              transactionDate: formattedDate
            });
            
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load fine details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  private initForm(): void {
    this.fineForm = this.fb.group({
      memberId: [null, Validators.required],
      memberSearch: ['', Validators.required],
      amount: [null, [
        Validators.required, 
        Validators.min(10), 
        Validators.max(300), // Match backend cap
        Validators.pattern(/^\d+(\.\d{1,2})?$/) // Allow up to 2 decimal places
      ]],
      reason: ['', [Validators.required, Validators.maxLength(200)]],
      status: ['Pending', Validators.required],
      transactionDate: [new Date().toISOString().split('T')[0], Validators.required]
    });
    
    // If in edit mode, disable member selection as it cannot be changed
    if (this.isEditMode) {
      this.fineForm.get('memberSearch')?.disable();
    }
  }
  
  private setupMemberSearch(): void {
    this.fineForm.get('memberSearch')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          if (typeof value === 'string' && value.trim().length > 2) {
            return this.searchMembers(value);
          }
          return of([]);
        })
      )
      .subscribe(members => {
        this.memberSearchResults = members;
      });
  }
  
  searchMembers(query: string): Observable<MemberResponseDto[]> {
    return this.memberService.getMembers({ searchTerm: query });
  }
  
  selectMember(member: MemberResponseDto): void {
    this.selectedMember = member;
    this.fineForm.patchValue({
      memberId: member.memberID,
      memberSearch: member
    });
    this.memberSearchResults = [];
  }
  
  onSubmit(): void {
    if (this.fineForm.invalid) {
      this.markFormGroupTouched(this.fineForm);
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    const formValues = this.fineForm.getRawValue(); // Get values including disabled fields
    
    if (this.isEditMode) {
      this.updateFine(formValues);
    } else {
      this.createFine(formValues);
    }
  }
  
  private createFine(formValues: any): void {
    const createDto: CreateFineDto = {
      memberID: formValues.memberId,
      amount: formValues.amount,
      status: formValues.status,
      transactionDate: new Date(formValues.transactionDate).toISOString(),
    };
    
    this.fineService.createFine(createDto).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        this.snackBar.open('Fine created successfully!', 'Close', { duration: 3000 });
        
        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(['/fines']);
        }, 1500);
      },
      error: (err) => {
        this.error = 'Failed to create fine: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  private updateFine(formValues: any): void {
    if (!this.fineId) return;
    
    const updateDto: UpdateFineDto = {
      fineID: this.fineId,
      memberID: formValues.memberId,
      amount: formValues.amount,
      status: formValues.status,
      transactionDate: new Date(formValues.transactionDate).toISOString(),
    };
    
    this.fineService.updateFine(updateDto).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        this.snackBar.open('Fine updated successfully!', 'Close', { duration: 3000 });
        
        // Redirect after a short delay
        setTimeout(() => {
          this.router.navigate(['/fines']);
        }, 1500);
      },
      error: (err) => {
        this.error = 'Failed to update fine: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  resetForm(): void {
    this.fineForm.reset({
      status: 'Pending',
      transactionDate: new Date().toISOString().split('T')[0]
    });
    this.selectedMember = null;
    this.memberSearchResults = [];
  }
  
  cancel(): void {
    this.router.navigate(['/fines']);
  }
  
  displayMemberFn(member: MemberResponseDto): string {
    return member ? member.name : '';
  }
}
