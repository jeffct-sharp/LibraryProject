import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FineService } from '../fine.service';
import { AuthService } from '../../auth/auth.service';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { FineDetailsDto } from '../../../models/dtos/fine-dtos';
import { FineFilterUiModel, FineSummaryUiModel } from '../../../models/ui-models/fine-ui-models';
import { MemberService } from '../../members/member.service';
import { MemberResponseDto } from '../../../models/dtos/member-dtos';

@Component({
  selector: 'app-fine-list',
  templateUrl: './fine-list.component.html',
  styleUrls: ['./fine-list.component.scss']
})
export class FineListComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<FineDetailsDto>([]);
  displayedColumns: string[] = ['fineID', 'memberID', 'amount', 'status', 'transactionDate', 'actions'];
  filterForm: FormGroup;
  loading = false;
  error: string | null = null;
  
  // Summary data
  summaryData: FineSummaryUiModel = {
    totalFines: 0,
    pendingFines: 0,
    paidFines: 0,
    totalAmount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    averageAmount: 0
  };

  // Report functionality
  showReportPanel = false;
  reportForm: FormGroup;
  generatingReport = false;
  reportFormats = [
    { value: 'csv', label: 'CSV' },
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' }
  ];
  reportTypes = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'detailed', label: 'Detailed Report' },
    { value: 'overdue', label: 'Overdue Fines' },
    { value: 'member', label: 'Member-wise Report' }
  ];
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Member-specific mode
  memberId: number | null = null;
  memberDetails: MemberResponseDto | null = null;
  isMemberSpecific = false;

  constructor(
    private fineService: FineService,
    private authService: AuthService,
    private memberService: MemberService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private confirmationService: ConfirmationDialogService
  ) {
    // Helper function to get default start date (one month ago)
    const getDefaultStartDate = (): Date => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    };

    this.filterForm = this.fb.group({
      memberName: [''],
      status: [''],
      fromDate: [null],
      toDate: [null],
      minAmount: [''],
      maxAmount: ['']
    });

    // Initialize report form
    this.reportForm = this.fb.group({
      reportType: ['summary'],
      reportFormat: ['pdf'],
      includeCharts: [true],
      startDate: [getDefaultStartDate()],
      endDate: [new Date()],
      includeDetails: [true]
    });
  }

  ngOnInit(): void {
    // Initialize summary data to avoid undefined values
    this.summaryData = {
      totalFines: 0,
      pendingFines: 0,
      paidFines: 0,
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
      averageAmount: 0
    };
    
    // Check if we're in member-specific mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.memberId = +params['id'];
        this.isMemberSpecific = true;
        this.loadMemberDetails();
        this.loadMemberFines();
      } else {
        this.loadFines();
      }
    });

    // Subscribe to filter form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }
  
  ngAfterViewInit(): void {
    // Ensure the ViewChild references are available
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
    });
  }
  
  loadFines(): void {
    this.loading = true;
    this.error = null;
    
    this.fineService.getAllFines().subscribe({
      next: (fines) => {
        this.dataSource.data = fines;
        this.loading = false;
        this.calculateSummary(fines);
      },
      error: (err) => {
        this.error = 'Failed to load fines: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  loadMemberDetails(): void {
    if (!this.memberId) return;
    
    this.memberService.getMember(this.memberId).subscribe({
      next: (member) => {
        this.memberDetails = member;
      },
      error: (err) => {
        this.error = 'Failed to load member details: ' + (err.message || 'Unknown error');
      }
    });
  }
  
  loadMemberFines(): void {
    if (!this.memberId) return;
    
    this.loading = true;
    this.error = null;
    
    this.fineService.getMemberFines(this.memberId).subscribe({
      next: (fines) => {
        this.dataSource.data = fines;
        this.loading = false;
        this.calculateSummary(fines);
      },
      error: (err) => {
        this.error = 'Failed to load member fines: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }
  
  calculateSummary(fines: FineDetailsDto[]): void {
    const summary: FineSummaryUiModel = {
      totalFines: fines.length,
      pendingFines: 0,
      paidFines: 0,
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
      averageAmount: 0
    };
    
    fines.forEach(fine => {
      summary.totalAmount += fine.amount;
      
      if (fine.status === 'Pending') {
        summary.pendingFines++;
        summary.pendingAmount += fine.amount;
      } else if (fine.status === 'Paid') {
        summary.paidFines++;
        summary.paidAmount += fine.amount;
      }
    });
    
    summary.averageAmount = fines.length > 0 ? 
      summary.totalAmount / fines.length : 0;
    
    this.summaryData = summary;
  }
  
  applyFilters(): void {
    const filterValues = this.filterForm.value as FineFilterUiModel;
    
    this.dataSource.filterPredicate = (data: FineDetailsDto, filter: string) => {
      // Member ID filter 
      if (filterValues.memberName && 
          !data.memberID.toString().includes(filterValues.memberName)) {
        return false;
      }
      
      // Status filter
      if (filterValues.status && data.status !== filterValues.status) {
        return false;
      }
      
      // Amount range filters
      if (filterValues.minAmount && data.amount < +filterValues.minAmount) {
        return false;
      }
      
      if (filterValues.maxAmount && data.amount > +filterValues.maxAmount) {
        return false;
      }
      
      // Date range filters
      if (filterValues.fromDate) {
        const fromDate = new Date(filterValues.fromDate);
        const transactionDate = new Date(data.transactionDate);
        if (transactionDate < fromDate) {
          return false;
        }
      }
      
      if (filterValues.toDate) {
        const toDate = new Date(filterValues.toDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        const transactionDate = new Date(data.transactionDate);
        if (transactionDate > toDate) {
          return false;
        }
      }
      
      return true;
    };
    
    this.dataSource.filter = 'APPLY_FILTERS';
  }
  
  resetFilters(): void {
    this.filterForm.reset({
      memberName: '',
      status: '',
      fromDate: null,
      toDate: null,
      minAmount: '',
      maxAmount: ''
    });
    
    this.dataSource.filter = '';
  }
  
  payFine(fineId: number): void {
    this.confirmationService.confirm(
      'Are you sure you want to mark this fine as paid?',
      'Confirm Payment'
    ).subscribe(result => {
      if (result) {
        this.router.navigate(['/fines/payment'], { 
          queryParams: { fineId: fineId } 
        });
      }
    });
  }
  
  deleteFine(fineId: number): void {
    this.confirmationService.confirmDelete('fine').subscribe(result => {
      if (result) {
        this.fineService.deleteFine(fineId).subscribe({
          next: () => {
            this.snackBar.open('Fine deleted successfully', 'Close', { duration: 3000 });
            this.loadFines();
          },
          error: (err) => {
            this.error = 'Failed to delete fine: ' + (err.message || 'Unknown error');
          }
        });
      }
    });
  }
  
  applyOverdueFines(): void {
    this.confirmationService.confirm(
      'Are you sure you want to apply fines for all overdue books?',
      'Confirm Apply Fines'
    ).subscribe(result => {
      if (result) {
        this.loading = true;
        this.fineService.applyOverdueFines().subscribe({
          next: (result) => {
            this.snackBar.open(
              `Applied ${result.finesCreated} new fines totaling ₹${result.totalAmount}`,
              'Close',
              { duration: 5000 }
            );
            this.loadFines();
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to apply overdue fines: ' + (err.message || 'Unknown error');
            this.loading = false;
          }
        });
      }
    });
  }
  
  viewFineDetails(fineId: number): void {
    this.router.navigate(['/fines', fineId]);
  }
  
  goToMemberDetails(): void {
    if (this.memberId) {
      this.router.navigate(['/members', this.memberId]);
    }
  }
  
  formatDate(date: string): string {
    return this.fineService.formatDate(date);
  }
  
  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '₹0.00';
    return '₹' + amount.toFixed(2);
  }
  
  getStatusClass(status: string): string {
    return status === 'Paid' ? 'status-paid' : 'status-pending';
  }
  
  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }
  
  isLibrarian(): boolean {
    return this.authService.hasRole('Librarian');
  }
  
  canManageFines(): boolean {
    return this.fineService.canManageFines();
  }
  
  // Report generation methods
  toggleReportPanel(): void {
    this.showReportPanel = !this.showReportPanel;
  }
  
  generateReport(): void {
    if (!this.reportForm || this.reportForm.invalid) {
      this.snackBar.open('Please fill in all required report fields', 'Close', { duration: 3000 });
      return;
    }
    
    this.generatingReport = true;
    
    // Get report form values
    const reportData = this.reportForm.value;
    console.log('Report configuration:', reportData);
    
    // Simulate report generation (in a real app, this would call a backend service)
    setTimeout(() => {
      this.generatingReport = false;
      
      // Based on the selected format, generate the appropriate file
      if (reportData.reportFormat === 'csv') {
        this.exportToCSV();
      } else if (reportData.reportFormat === 'pdf') {
        this.generatePDFReport();
      } else if (reportData.reportFormat === 'excel') {
        this.generateExcelReport();
      }
      
      this.snackBar.open('Report generated successfully', 'Close', { duration: 3000 });
    }, 1500);
  }
  
  private generatePDFReport(): void {
    // In a real application, you would use a library like jsPDF or call a backend service
    // For this demo, we'll create a simple HTML-to-PDF simulation
    
    // Create a report content div
    const reportDiv = document.createElement('div');
    reportDiv.style.display = 'none';
    reportDiv.innerHTML = `
      <h1 style="text-align: center; color: #1a237e;">Fine Management Report</h1>
      <h3 style="text-align: center;">Generated on ${new Date().toLocaleDateString()}</h3>
      
      <div style="margin-top: 20px;">
        <h4>Summary</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Metric</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Value</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Total Fines</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.summaryData.totalFines}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Pending Fines</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.summaryData.pendingFines}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Paid Fines</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.summaryData.paidFines}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Total Amount</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(this.summaryData.totalAmount)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Average Fine Amount</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(this.summaryData.averageAmount)}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 30px;">
        <h4>Fine Details</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Member ID</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Transaction Date</th>
          </tr>
          ${this.dataSource.filteredData.slice(0, 10).map(fine => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${fine.fineID}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${fine.memberID}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${this.formatCurrency(fine.amount)}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${fine.status}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${this.formatDate(fine.transactionDate)}</td>
            </tr>
          `).join('')}
        </table>
        ${this.dataSource.filteredData.length > 10 ? `<p style="text-align: center; font-style: italic;">Showing 10 of ${this.dataSource.filteredData.length} records</p>` : ''}
      </div>
      
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
        <p>Generated by Library Management System</p>
        <p>Report Type: ${this.reportForm.get('reportType')?.value}</p>
      </div>
    `;
    
    document.body.appendChild(reportDiv);
    
    // Convert HTML content to data URL
    const printContent = reportDiv.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fine Management Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f2f2f2; text-align: left; }
            h1, h3, h4 { color: #1a237e; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <div style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #1a237e; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print Report
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      this.snackBar.open('Pop-up blocked. Please allow pop-ups for this site to download reports.', 'Close', { duration: 5000 });
    }
    
    // Remove the temporary div
    document.body.removeChild(reportDiv);
  }
  
  private generateExcelReport(): void {
    // Create a CSV with more formatting that could be opened in Excel
    const data = this.dataSource.filteredData;
    if (data.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    
    const headers = ['Fine ID', 'Member ID', 'Amount', 'Status', 'Transaction Date'];
    const csvData = data.map(item => [
      item.fineID,
      item.memberID,
      item.amount,
      item.status,
      this.formatDate(item.transactionDate)
    ]);
    
    // Add summary data at the top
    const summaryData = [
      ['Fine Management Report'],
      ['Generated on', new Date().toLocaleDateString()],
      [''],
      ['Summary Statistics'],
      ['Total Fines', this.summaryData.totalFines],
      ['Pending Fines', this.summaryData.pendingFines],
      ['Paid Fines', this.summaryData.paidFines],
      ['Total Amount', this.formatCurrency(this.summaryData.totalAmount).replace('₹', '')],
      ['Average Fine', this.formatCurrency(this.summaryData.averageAmount).replace('₹', '')],
      [''],
      ['Fine Details']
    ];
    
    // Combine summary and data
    const excelData = [
      ...summaryData,
      headers,
      ...csvData
    ];
    
    const csvString = excelData.map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `fine_report_${date}.csv`;
    
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  exportToCSV(): void {
    const data = this.dataSource.filteredData;
    if (data.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }
    
    const headers = ['Fine ID', 'Member ID', 'Amount', 'Status', 'Transaction Date'];
    const csvData = data.map(item => [
      item.fineID,
      item.memberID,
      item.amount,
      item.status,
      this.formatDate(item.transactionDate)
    ]);
    
    csvData.unshift(headers);
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `fines_${date}.csv`;
    
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Export successful', 'Close', { duration: 3000 });
  }
}
