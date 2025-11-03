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
  sortBy = 'createdAt';
  sortOrder = 'desc';
  
  // User info
  userRole = '';
  
  // UI state
  showFilters = false;
  selectedProcess: string | null = null;
  
  // Process grouping
  processes: { processName: string; count: number }[] = [];
  processGroupsMap: Map<string, SOP[]> = new Map();
  
  // Get processes as array for template
  get processesArray(): { processName: string; count: number }[] {
    return this.processes;
  }
  
  // Get SOPs for selected process
  get processSOPs(): SOP[] {
    if (!this.selectedProcess) {
      return [];
    }
    return this.processGroupsMap.get(this.selectedProcess) || [];
  }

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

    // For process view (initial load), fetch more SOPs to see all processes
    const limit = this.selectedProcess ? this.itemsPerPage : 1000;

    const params = {
      page: this.selectedProcess ? this.currentPage : 1,
      limit: limit,
      search: this.searchTerm || undefined,
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
        
        // Group SOPs by process
        this.groupSOPsByProcess();
        
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
    this.selectedProcess = null; // Reset to process view when searching
    this.loadSOPs();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.selectedProcess = null; // Reset to process view when filtering
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
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.selectedProcess = null; // Reset to process view
    this.loadSOPs();
  }

  getMaxDisplayItems(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  groupSOPsByProcess(): void {
    this.processGroupsMap.clear();
    
    // Group SOPs by process name
    this.sops.forEach(sop => {
      const processName = sop.process || 'Uncategorized';
      if (!this.processGroupsMap.has(processName)) {
        this.processGroupsMap.set(processName, []);
      }
      this.processGroupsMap.get(processName)!.push(sop);
    });
    
    // Create processes array with counts
    this.processes = Array.from(this.processGroupsMap.entries()).map(([processName, sops]) => ({
      processName,
      count: sops.length
    })).sort((a, b) => a.processName.localeCompare(b.processName));
  }

  selectProcess(processName: string): void {
    this.selectedProcess = processName;
    this.currentPage = 1;
  }

  backToProcessList(): void {
    this.selectedProcess = null;
    this.currentPage = 1;
  }
}
