import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SOPService, SOP } from '../services/sop.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-list.html',
  styleUrls: ['./sop-list.css']
})
export class SOPListComponent implements OnInit {
  sops: SOP[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;
  
  // Filters
  searchTerm = '';
  statusFilter = '';
  sortBy = 'createdAt';
  sortOrder = 'desc';
  
  // User info
  userRole = '';
  
  // UI state
  showFilters = false;

  constructor(
    private sopService: SOPService,
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
        console.log('User role from token:', this.userRole); // Debug log
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
      }
    } else {
      console.log('No token found'); // Debug log
    }
  }

  ngOnInit(): void {
    this.loadSOPs();
  }

  loadSOPs(): void {
    this.loading = true;
    this.error = '';

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    this.sopService.getAllSOPs(params).subscribe({
      next: (response) => {
        this.sops = response.sops;
        if (response.pagination) {
          this.currentPage = response.pagination.currentPage;
          this.totalPages = response.pagination.totalPages;
          this.totalItems = response.pagination.totalItems;
          this.itemsPerPage = response.pagination.itemsPerPage;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading SOPs:', error);
        this.error = 'Failed to load SOPs. Please try again.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadSOPs();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadSOPs();
  }

  onSortChange(): void {
    this.loadSOPs();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadSOPs();
    }
  }

  viewSOP(sop: SOP): void {
    this.router.navigate(['/sops', sop._id]);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
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

  canCreateSOP(): boolean {
    return this.userRole === 'manager';
  }

  createSOP(): void {
    this.router.navigate(['/sops/create']);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadSOPs();
  }

  getMaxDisplayItems(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
}
