import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuickLinkService, QuickLink } from '../services/quick-link.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-quick-links',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-links.html',
  styleUrls: ['./quick-links.css']
})
export class QuickLinksComponent implements OnInit {
  quickLinks: QuickLink[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;
  
  // Filters
  searchTerm = '';
  sortBy = 'createdAt';
  sortOrder = 'desc';
  
  // User info
  userRole = '';
  
  // UI state
  showFilters = false;

  constructor(
    private quickLinkService: QuickLinkService,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeUserRole();
  }

  private initializeUserRole(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
      }
    }
  }

  ngOnInit(): void {
    this.loadQuickLinks();
  }

  loadQuickLinks(): void {
    this.loading = true;
    this.error = '';

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.quickLinkService.getAllQuickLinks(params).subscribe({
      next: (response) => {
        this.quickLinks = response.quickLinks;
        if (response.pagination) {
          this.currentPage = response.pagination.currentPage;
          this.totalPages = response.pagination.totalPages;
          this.totalItems = response.pagination.totalItems;
          this.itemsPerPage = response.pagination.itemsPerPage;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading Quick Links:', error);
        this.error = 'Failed to load Quick Links. Please try again.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadQuickLinks();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadQuickLinks();
  }

  onSortChange(): void {
    this.loadQuickLinks();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadQuickLinks();
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  createQuickLink(): void {
    this.router.navigate(['/quick-links/create']);
  }

  editQuickLink(quickLink: QuickLink): void {
    this.router.navigate(['/quick-links', quickLink._id, 'edit']);
  }

  deleteQuickLink(quickLink: QuickLink): void {
    if (confirm(`Are you sure you want to delete "${quickLink.title}"?`)) {
      this.quickLinkService.deleteQuickLink(quickLink._id).subscribe({
        next: () => {
          this.loadQuickLinks();
        },
        error: (error) => {
          console.error('Error deleting Quick Link:', error);
          this.error = 'Failed to delete Quick Link. Please try again.';
        }
      });
    }
  }

  canEditQuickLink(quickLink: QuickLink): boolean {
    return this.quickLinkService.canEditQuickLink(quickLink);
  }

  openLink(link: string): void {
    window.open(link, '_blank');
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadQuickLinks();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  getMaxDisplayItems(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }
}

