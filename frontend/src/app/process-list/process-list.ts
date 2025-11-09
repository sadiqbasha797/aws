import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcessService, Process } from '../services/process.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-process-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './process-list.html',
  styleUrl: './process-list.css'
})
export class ProcessListComponent implements OnInit {
  processes: Process[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;
  pageSize = 10;
  
  // Search
  searchTerm = '';
  
  userRole: string = '';

  constructor(
    private processService: ProcessService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeComponent();
    
    // Check if user is manager, if not redirect
    if (this.userRole !== 'manager') {
      // Optionally redirect or show access denied message
      this.errorMessage = 'Access denied. Only managers can access this page.';
      return;
    }
    
    this.loadProcesses();
  }

  private initializeComponent() {
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

  loadProcesses() {
    this.isLoading = true;
    this.errorMessage = '';
    
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    
    if (this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    
    this.processService.getAllProcesses(params).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.processes) {
          this.processes = response.data.processes;
          this.totalRecords = response.total || 0;
          this.totalPages = response.pages || 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading processes:', error);
        this.errorMessage = error.error?.message || 'Failed to load processes';
        this.isLoading = false;
      }
    });
  }

  search() {
    this.currentPage = 1;
    this.loadProcesses();
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadProcesses();
  }

  showCreateForm() {
    // Navigate to separate create page
    this.router.navigate(['/processes/create']);
  }

  showEditForm(process: Process) {
    // Navigate to separate edit page
    this.router.navigate(['/processes', process._id, 'edit']);
  }

  deleteProcess(id: string) {
    if (!confirm('Are you sure you want to delete this process?')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.processService.deleteProcess(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = 'Process deleted successfully';
          this.loadProcesses();
        } else {
          this.errorMessage = response.message || 'Delete failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error deleting process:', error);
        this.errorMessage = error.error?.message || 'Failed to delete process';
      }
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadProcesses();
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPaginationPages(): number[] {
    const maxPages = Math.min(5, this.totalPages);
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
}

