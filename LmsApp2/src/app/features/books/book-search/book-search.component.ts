import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BookSearchUiModel } from '../../../models/ui-models/book-ui-models';

@Component({
  selector: 'app-book-search',
  templateUrl: './book-search.component.html',
  styleUrls: ['./book-search.component.scss']
})
export class BookSearchComponent implements OnInit {
  @Output() search = new EventEmitter<BookSearchUiModel>();
  searchForm: FormGroup;

  // Add a list of common book genres
  genres: string[] = [
    'Fiction',
    'Non-fiction',
    'Mystery',
    'Thriller',
    'Romance',
    'Science Fiction',
    'Fantasy',
    'Biography',
    'History',
    'Self-Help',
    'Business',
    'Children',
    'Young Adult',
    'Poetry',
    'Comics',
    'Art',
    'Cooking',
    'Travel'
  ];

  // Track current search params for display
  activeFilters: { [key: string]: any } = {};

  constructor(private fb: FormBuilder) {
    this.searchForm = this.fb.group({
      title: [''],
      author: [''],
      genre: [''],
      isbn: [''],
      availableCopiesGreaterThanZero: [false],
      yearPublishedFrom: [''],
      yearPublishedTo: ['']
    });
  }

  ngOnInit() {
    // Listen for form changes to update active filters
    this.searchForm.valueChanges.subscribe(values => {
      this.activeFilters = {};
      Object.keys(values).forEach(key => {
        if (values[key]) {
          if (key === 'availableCopiesGreaterThanZero' && values[key]) {
            this.activeFilters['Available Only'] = 'Yes';
          } else if (values[key]) {
            this.activeFilters[this.formatFilterName(key)] = values[key];
          }
        }
      });
    });
  }

  // Helper methods for template to avoid Object reference issues
  getFilterCount(): number {
    return Object.keys(this.activeFilters).length;
  }

  getFilterKeys(): string[] {
    return Object.keys(this.activeFilters);
  }

  private formatFilterName(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  removeFilter(key: string): void {
    // Find the form control name from the displayed filter name
    const formKey = Object.keys(this.searchForm.controls).find(k =>
      this.formatFilterName(k) === key
    );

    if (formKey) {
      if (formKey === 'availableCopiesGreaterThanZero') {
        this.searchForm.get(formKey)?.setValue(false);
      } else {
        this.searchForm.get(formKey)?.setValue('');
      }
      this.onSubmit();
    }
  }

  onSubmit() {
    this.search.emit(this.searchForm.value);
  }

  onReset() {
    this.searchForm.reset({ availableCopiesGreaterThanZero: false });
    this.search.emit({});
  }
}
