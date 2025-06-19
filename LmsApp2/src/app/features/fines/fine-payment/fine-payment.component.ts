import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FineService } from '../fine.service';
import { FineDetailsDto, PayFineDto } from '../../../models/dtos/fine-dtos';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { Location } from '@angular/common';
import { NotificationService } from '../../notifications/notification.service';
import { FinePaymentUiModel } from '../../../models/ui-models/fine-ui-models';

@Component({
  selector: 'app-fine-payment',
  templateUrl: './fine-payment.component.html',
  styleUrls: ['./fine-payment.component.scss']
})
export class FinePaymentComponent implements OnInit {
  fine: FineDetailsDto | null = null;
  paymentForm!: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;
  
  // Payment methods available in the system
  paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer'];

  // Track navigation source
  private returnUrl: string = '/fines';

  constructor(
    private authService: AuthService,
    private fineService: FineService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private location: Location,
    private confirmationService: ConfirmationDialogService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Only admins and librarians can process payments
    if (!this.authService.hasRole('Admin') && !this.authService.hasRole('Librarian')) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    // Get return URL if available
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
      
      // If we're redirected from member details, set returnUrl to member
      if (params['memberId']) {
        this.returnUrl = `/members/${params['memberId']}`;
      }
    });

    // Get fine ID from query params
    const fineId = this.route.snapshot.queryParamMap.get('fineId');
    if (fineId) {
      this.loadFineDetails(+fineId);
    } else {
      this.error = 'No fine ID provided';
    }
  }

  private initializeForm(): void {
    this.paymentForm = this.fb.group({
      fineID: [null, Validators.required],
      amount: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      paymentMethod: ['Cash', Validators.required],
      notes: ['']
    });
  }

  loadFineDetails(fineId: number): void {
    this.loading = true;
    this.fineService.getFineById(fineId).subscribe({
      next: (fine) => {
        this.fine = fine;
        
        // Check if fine is already paid
        if (fine.status === 'Paid') {
          this.error = 'This fine has already been paid';
          this.loading = false;
          return;
        }
        
        // Populate form with fine details
        this.paymentForm.patchValue({
          fineID: fine.fineID,
          amount: fine.amount
        });
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load fine details: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  private processFinePayment(paymentDto: PayFineDto): void {
    this.loading = true;
    this.error = null;
    
    this.fineService.payFine(paymentDto).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        this.snackBar.open('Payment processed successfully!', 'Close', { duration: 3000 });
        
        // Send notification
        this.sendPaymentNotification(paymentDto.fineID);
        
        // Navigate back after a short delay
        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.router.navigate(['/fines']);
          }
        }, 2000);
      },
      error: (err) => {
        this.error = 'Failed to process payment: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    // Get form values including disabled controls
    const formValues = this.paymentForm.getRawValue();
    
    // Create the PayFineDto with only the required properties for API
    const paymentDto: PayFineDto = {
      fineID: this.fine?.fineID || 0,
      amount: formValues.amount
    };

    // Show confirmation dialog before processing payment
    this.confirmationService.confirm(
      `Are you sure you want to process payment of ${this.formatCurrency(formValues.amount)} for fine #${paymentDto.fineID}?`,
      'Confirm Payment'
    ).subscribe(confirmed => {
      if (confirmed) {
        this.processFinePayment(paymentDto);
      }
    });
  }

  sendPaymentNotification(fineId: number): void {
    this.notificationService.notifyFinePayment(fineId).subscribe({
      next: () => {
        this.snackBar.open('Payment notification sent successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to send payment notification', err);
        this.snackBar.open('Payment processed but notification failed to send', 'Close', { duration: 3000 });
      }
    });
  }

  cancelPayment(): void {
    // Go back to previous page or fallback to fines list
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
  
  formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return '₹0.00';
    return '₹' + amount.toFixed(2);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
