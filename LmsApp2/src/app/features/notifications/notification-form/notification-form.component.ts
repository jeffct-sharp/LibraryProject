import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../notification.service';
import { MemberService } from '../../members/member.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';
import { CreateNotificationDto } from '../../../models/dtos/notification-dtos';
import { Observable, catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-notification-form',
  templateUrl: './notification-form.component.html',
  styleUrls: ['./notification-form.component.css']
})
export class NotificationFormComponent implements OnInit {
  notificationForm!: FormGroup;
  members: MemberResponseDto[] = [];
  filteredMembers: MemberResponseDto[] = [];
  loading = false;
  membersLoading = false;
  error: string | null = null;
  success = false;
  searchTerm: string = '';

  // Template options
  templateOptions = [
    { value: 'dueReminder', label: 'Due Date Reminder', template: 'This is a reminder that your book is due on {dueDate}.' },
    { value: 'overdue', label: 'Overdue Notice', template: 'Your book is overdue. Please return it as soon as possible to avoid fines.' },
    { value: 'fineNotice', label: 'Fine Notice', template: 'A fine of {amount} has been added to your account for an overdue book.' },
    { value: 'accountUpdated', label: 'Account Updated', template: 'Your library account information has been updated.' },
    { value: 'bookAvailable', label: 'Book Available', template: 'A book you reserved is now available for pickup.' },
    { value: 'generalNotice', label: 'General Notice', template: '' }
  ];

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private memberService: MemberService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadMembers();
  }

  initializeForm(): void {
    this.notificationForm = this.fb.group({
      memberId: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.maxLength(500)]],
      template: ['generalNotice']
    });

    // Listen for template changes to update the message
    this.notificationForm.get('template')?.valueChanges.subscribe(template => {
      const selectedTemplate = this.templateOptions.find(t => t.value === template);
      if (selectedTemplate && template !== 'generalNotice') {
        this.notificationForm.patchValue({
          message: selectedTemplate.template
        });
      }
    });
  }

  loadMembers(): void {
    this.membersLoading = true;
    this.memberService.getMembers().subscribe({
      next: (members: MemberResponseDto[]) => {
        this.members = members;
        this.filteredMembers = members;
        this.membersLoading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load members: ' + (err.message || 'Unknown error');
        this.membersLoading = false;
        console.error('Error loading members:', err);
      }
    });
  }
  
  searchMembers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMembers = this.members;
      return;
    }
    
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredMembers = this.members.filter(member => 
      member.name.toLowerCase().includes(term) || 
      member.email?.toLowerCase().includes(term) ||
      member.memberID.toString().includes(term)
    );
  }
  
  sendToAllActive(): Observable<boolean> {
    return new Observable(observer => {
      this.confirmSendToAll().subscribe(confirmed => {
        if (confirmed) {
          const activeMembers = this.members.filter(m => m.membershipStatus === 'Active');
          if (activeMembers.length === 0) {
            this.snackBar.open('No active members found', 'Close', { duration: 3000 });
            observer.next(false);
            observer.complete();
            return;
          }
          
          this.snackBar.open(`Sending to ${activeMembers.length} active members...`, 'Close', { duration: 3000 });
          observer.next(true);
        } else {
          observer.next(false);
        }
        observer.complete();
      });
    });
  }
  
  confirmSendToAll(): Observable<boolean> {
    const activeCount = this.members.filter(m => m.membershipStatus === 'Active').length;
    
    return new Observable(observer => {
      if (confirm(`Are you sure you want to send this notification to all ${activeCount} active members?`)) {
        observer.next(true);
      } else {
        observer.next(false);
      }
      observer.complete();
    });
  }
  
  onSubmit(): void {
    if (this.notificationForm.invalid) {
      this.markFormGroupTouched(this.notificationForm);
      return;
    }

    this.loading = true;
    this.error = null;
    
    const sendToAll = this.notificationForm.get('memberId')?.value === 'all';
    
    this.updateFormState(true);
    
    if (sendToAll) {
      this.sendToAllActive().subscribe(proceed => {
        if (proceed) {
          this.sendToAllMembers();
        } else {
          this.loading = false;
          this.updateFormState(false);
        }
      });
    } else {
      this.sendSingleNotification();
    }
  }
  
  sendSingleNotification(): void {
    const notificationData: CreateNotificationDto = {
      memberID: this.notificationForm.value.memberId,
      message: this.notificationForm.value.message,
      dateSent: new Date().toISOString()
    };

    this.notificationService.createNotification(notificationData).subscribe({
      next: () => {
        this.handleSuccess();
      },
      error: (err) => {
        this.handleError(err);
      }
    });
  }
  
  sendToAllMembers(): void {
    const activeMembers = this.members.filter(m => m.membershipStatus === 'Active');
    let completed = 0;
    let errors = 0;
    
    activeMembers.forEach(member => {
      const notificationData: CreateNotificationDto = {
        memberID: member.memberID,
        message: this.notificationForm.value.message,
        dateSent: new Date().toISOString()
      };
      
      this.notificationService.createNotification(notificationData)
        .pipe(
          catchError(err => {
            errors++;
            console.error(`Error sending to member ${member.memberID}:`, err);
            return of(null);
          }),
          finalize(() => {
            completed++;
            if (completed === activeMembers.length) {
              if (errors === 0) {
                this.handleSuccess(`Sent to all ${activeMembers.length} active members`);
              } else {
                this.handlePartialSuccess(activeMembers.length, errors);
              }
            }
          })
        )
        .subscribe();
    });
  }
  
  handleSuccess(message: string = 'Notification sent successfully!'): void {
    this.loading = false;
    this.success = true;
    this.snackBar.open(message, 'Close', { duration: 3000 });
    
    // Navigate after a brief delay
    setTimeout(() => {
      this.router.navigate(['/notifications']);
    }, 1500);
  }
  
  handlePartialSuccess(total: number, errors: number): void {
    this.loading = false;
    this.success = true;
    this.snackBar.open(`Sent to ${total - errors} of ${total} members. ${errors} failed.`, 'Close', { duration: 5000 });
    
    // Navigate after a brief delay
    setTimeout(() => {
      this.router.navigate(['/notifications']);
    }, 2000);
  }
  
  handleError(err: any): void {
    this.error = 'Failed to create notification: ' + (err.message || 'Unknown error');
    this.loading = false;
    this.snackBar.open('Error sending notification', 'Dismiss', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper method to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  resetForm(): void {
    this.notificationForm.reset({
      memberId: '',
      message: '',
      template: 'generalNotice'
    });
    this.error = null;
    this.searchTerm = '';
    this.filteredMembers = this.members;
  }

  // Gets the remaining characters for the message
  get remainingChars(): number {
    const maxLength = 500;
    const currentLength = this.notificationForm.get('message')?.value?.length || 0;
    return maxLength - currentLength;
  }

  // Gets the selected member name
  getSelectedMemberName(): string {
    const memberId = this.notificationForm.get('memberId')?.value;
    if (!memberId || memberId === 'all') return '';
    
    const member = this.members.find(m => m.memberID === Number(memberId));
    return member ? `${member.name}` : '';
  }

  cancel(): void {
    this.router.navigate(['/notifications']);
  }

  // Add method to properly handle form controls disabled state
  updateFormState(disabled: boolean): void {
    if (disabled) {
      this.notificationForm.disable();
    } else {
      this.notificationForm.enable();
    }
  }
}
