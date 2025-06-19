import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../book.service';
import { BookDetailsDto } from '../../../models/dtos/book-dtos';
import { BookSearchUiModel } from '../../../models/ui-models/book-ui-models';
import { AuthService } from '../../auth/auth.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ConfirmationDialogService } from '../../../core/confirmation-dialog.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.scss']
})
export class BookListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['title', 'author', 'genre', 'isbn', 'yearPublished', 'availableCopies', 'actions'];
  dataSource = new MatTableDataSource<BookDetailsDto>([]);
  loading = false;
  error: string | null = null;
  searchTerm: string = '';
  
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  paginationOptions = {
    pageSize: 10,
    pageSizeOptions: [5, 10, 25, 50]
  };

  currentSearchParams: BookSearchUiModel = {};
  allBooks: BookDetailsDto[] = [];

  constructor(
    private bookService: BookService,
    private authService: AuthService,
    private confirmationService: ConfirmationDialogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAllBooks();
  }

  ngAfterViewInit(): void {
    // We need to set paginator and sort after view init
    setTimeout(() => {
      // This setTimeout ensures the view is fully initialized
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
      
      // Set custom filter predicate
      this.dataSource.filterPredicate = this.createFilterPredicate();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllBooks(): void {
    this.loading = true;
    this.error = null;
    
    this.bookService.getBooks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (books) => {
          this.allBooks = books;
          // Make a copy of the array to ensure change detection works
          this.dataSource.data = [...books];
          this.loading = false;
          
          // Re-apply paginator and sort since we're setting new data
          setTimeout(() => {
            if (this.paginator) {
              this.dataSource.paginator = this.paginator;
            }
            if (this.sort) {
              this.dataSource.sort = this.sort;
            }
          });
          
          // Apply initial filters if any
          if (Object.keys(this.currentSearchParams).length > 0 || this.searchTerm) {
            this.applyFilters();
          }
        },
        error: (err) => {
          console.error('Failed to load books:', err);
          this.error = 'Failed to load books: ' + (err.message || 'Unknown error');
          this.loading = false;
        }
      });
  }

  searchBooks(): void {
    if (this.paginator) {
      this.paginator.firstPage(); // Reset to first page
    }
    
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.currentSearchParams = {
        ...this.currentSearchParams,
        searchTerm: this.searchTerm.trim()
      };
    } else {
      // Clear search term if empty
      const { searchTerm, ...rest } = this.currentSearchParams;
      this.currentSearchParams = rest;
    }
    
    this.applyFilters();
  }
  
  onSearch(params: BookSearchUiModel): void {
    if (this.paginator) {
      this.paginator.firstPage(); // Reset to first page
    }
    
    this.currentSearchParams = params;
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.currentSearchParams = {};
    
    // Reset pagination
    if (this.paginator) {
      this.paginator.firstPage();
    }
    
    // Clear filter and reset to all books
    this.dataSource.filter = '';
    this.dataSource.data = [...this.allBooks];
  }

  private applyFilters(): void {
    const filterValue = JSON.stringify(this.currentSearchParams);
    this.dataSource.filter = filterValue;
    
    // If after filtering there's no data on the current page, go to first page
    if (this.paginator && this.dataSource.paginator && 
        this.dataSource.filteredData.length <= this.paginator.pageSize * this.paginator.pageIndex) {
      this.paginator.firstPage();
    }
  }

  // Create custom filter predicate for complex filtering
  private createFilterPredicate(): (data: BookDetailsDto, filter: string) => boolean {
    return (data: BookDetailsDto, filter: string): boolean => {
      if (!filter) return true;
      
      try {
        const filterParams: BookSearchUiModel = JSON.parse(filter);
        
        // Check search term (global search)
        if (filterParams.searchTerm) {
          const searchTerm = filterParams.searchTerm.toLowerCase();
          const matchesSearchTerm = 
            data.title.toLowerCase().includes(searchTerm) ||
            data.author.toLowerCase().includes(searchTerm) ||
            (data.genre && data.genre.toLowerCase().includes(searchTerm)) ||
            data.isbn.includes(filterParams.searchTerm);
          
          if (!matchesSearchTerm) return false;
        }
        
        // Check specific fields
        if (filterParams.title && 
            !data.title.toLowerCase().includes(filterParams.title.toLowerCase())) {
          return false;
        }
        
        if (filterParams.author && 
            !data.author.toLowerCase().includes(filterParams.author.toLowerCase())) {
          return false;
        }
        
        if (filterParams.genre && data.genre && 
            !data.genre.toLowerCase().includes(filterParams.genre.toLowerCase())) {
          return false;
        }
        
        if (filterParams.isbn && !data.isbn.includes(filterParams.isbn)) {
          return false;
        }
        
        if (filterParams.yearPublishedFrom && data.yearPublished && 
            data.yearPublished < filterParams.yearPublishedFrom) {
          return false;
        }
        
        if (filterParams.yearPublishedTo && data.yearPublished && 
            data.yearPublished > filterParams.yearPublishedTo) {
          return false;
        }
        
        if (filterParams.availableCopiesGreaterThanZero && data.availableCopies <= 0) {
          return false;
        }
        
        // If all filters pass, keep the book
        return true;
      } catch (e) {
        // If parsing fails, apply the filter as a simple string
        const searchTerm = String(filter).toLowerCase();
        return Boolean(
          data.title.toLowerCase().includes(searchTerm) ||
          data.author.toLowerCase().includes(searchTerm) ||
          (data.genre && data.genre.toLowerCase().includes(searchTerm))
        );
      }
    };
  }

  // Delete book with confirmation
  deleteBook(bookID: number): void {
    const book = this.dataSource.data.find(b => b.bookID === bookID);
    if (!book) return;
    
    this.confirmationService.confirmDelete(book.title).subscribe(confirmed => {
      if (confirmed) {
        this.loading = true;
        this.bookService.deleteBook(bookID).subscribe({
          next: () => {
            // Reload all books after delete
            this.loadAllBooks();
          },
          error: (err) => {
            this.error = 'Failed to delete book: ' + (err.message || 'Unknown error');
            this.loading = false;
          }
        });
      }
    });
  }

  // Authorization check methods
  canEditOrDelete(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  isAdminOrLibrarian(): boolean {
    return this.authService.hasRole('Admin') || this.authService.hasRole('Librarian');
  }

  borrowBook(book: BookDetailsDto): void {
    if (book.availableCopies <= 0) {
      this.confirmationService.confirm(
        'This book is currently not available for borrowing. Please check back later.',
        'Book Not Available',
        'info'
      );
      return;
    }
    
    if (!this.authService.isAuthenticated()) {
      this.confirmationService.confirm(
        'You need to be logged in to borrow books. Would you like to login now?',
        'Login Required',
        'info'
      ).subscribe(result => {
        if (result) {
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: this.router.url } 
          });
        }
      });
      return;
    }
    
    this.router.navigate(['/transactions/borrow'], { 
      queryParams: { bookId: book.bookID } 
    });
  }
}
