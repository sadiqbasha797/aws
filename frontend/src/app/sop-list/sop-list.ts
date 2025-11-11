import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SOPService, SOP, BinItem } from '../services/sop.service';
import { QuickLinkService, QuickLink } from '../services/quick-link.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-list.html',
  styleUrls: ['./sop-list.css']
})
export class SOPListComponent implements OnInit {
  // Tab state
  activeTab: 'sops' | 'quickLinks' | 'trash' = 'sops';
  
  // SOPs data
  sops: SOP[] = [];
  loading = false;
  error = '';
  
  // Quick Links data
  quickLinks: QuickLink[] = [];
  quickLinksLoading = false;
  quickLinksError = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;
  
  // Quick Links pagination
  quickLinksCurrentPage = 1;
  quickLinksTotalPages = 1;
  quickLinksTotalItems = 0;
  quickLinksItemsPerPage = 10;
  
  // Filters
  searchTerm = '';
  sortBy = 'createdAt';
  sortOrder = 'desc';
  
  // Quick Links filters
  quickLinksSearchTerm = '';
  quickLinksSortBy = 'createdAt';
  quickLinksSortOrder = 'desc';
  
  // User info
  userRole = '';
  userId = '';
  
  // UI state
  showFilters = false;
  showQuickLinksFilters = false;
  selectedProcess: string | null = null;
  
  // Process grouping
  processes: { processName: string; count: number }[] = [];
  processGroupsMap: Map<string, SOP[]> = new Map();
  
  // Trash/Bin properties
  binItems: BinItem[] = [];
  binLoading = false;
  binError = '';
  selectedBinCollection = 'sops';
  
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
        this.userId = payload.userId || payload.id || '';
        console.log('User role from token:', this.userRole); // Debug log
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
        this.userId = '';
      }
    } else {
      console.log('No token found'); // Debug log
    }
  }

  ngOnInit(): void {
    this.loadSOPs();
    this.loadQuickLinks();
  }
  
  // Tab switching
  switchTab(tab: 'sops' | 'quickLinks' | 'trash'): void {
    this.activeTab = tab;
    if (tab === 'quickLinks' && this.quickLinks.length === 0) {
      this.loadQuickLinks();
    } else if (tab === 'trash' && this.binItems.length === 0) {
      this.loadBinItems();
    }
  }
  
  // Quick Links methods
  loadQuickLinks(): void {
    this.quickLinksLoading = true;
    this.quickLinksError = '';

    const params = {
      page: this.quickLinksCurrentPage,
      limit: this.quickLinksItemsPerPage,
      search: this.quickLinksSearchTerm || undefined,
      sortBy: this.quickLinksSortBy,
      sortOrder: this.quickLinksSortOrder
    };

    this.quickLinkService.getAllQuickLinks(params).subscribe({
      next: (response) => {
        this.quickLinks = response.quickLinks;
        if (response.pagination) {
          this.quickLinksCurrentPage = response.pagination.currentPage;
          this.quickLinksTotalPages = response.pagination.totalPages;
          this.quickLinksTotalItems = response.pagination.totalItems;
          this.quickLinksItemsPerPage = response.pagination.itemsPerPage;
        }
        this.quickLinksLoading = false;
      },
      error: (error) => {
        console.error('Error loading Quick Links:', error);
        this.quickLinksError = 'Failed to load Quick Links. Please try again.';
        this.quickLinksLoading = false;
      }
    });
  }
  
  onQuickLinksSearch(): void {
    this.quickLinksCurrentPage = 1;
    this.loadQuickLinks();
  }
  
  onQuickLinksFilterChange(): void {
    this.quickLinksCurrentPage = 1;
    this.loadQuickLinks();
  }
  
  onQuickLinksSortChange(): void {
    this.loadQuickLinks();
  }
  
  onQuickLinksPageChange(page: number): void {
    if (page >= 1 && page <= this.quickLinksTotalPages) {
      this.quickLinksCurrentPage = page;
      this.loadQuickLinks();
    }
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
          this.quickLinksError = 'Failed to delete Quick Link. Please try again.';
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
  
  clearQuickLinksFilters(): void {
    this.quickLinksSearchTerm = '';
    this.quickLinksSortBy = 'createdAt';
    this.quickLinksSortOrder = 'desc';
    this.quickLinksCurrentPage = 1;
    this.loadQuickLinks();
  }
  
  toggleQuickLinksFilters(): void {
    this.showQuickLinksFilters = !this.showQuickLinksFilters;
  }
  
  getQuickLinksPaginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.quickLinksCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.quickLinksTotalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  getQuickLinksMaxDisplayItems(): number {
    return Math.min(this.quickLinksCurrentPage * this.quickLinksItemsPerPage, this.quickLinksTotalItems);
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

  canEditSOP(sop: SOP): boolean {
    return !!(sop && sop.createdBy && sop.createdBy.userId === this.userId);
  }

  canDeleteSOP(sop: SOP): boolean {
    return !!(sop && sop.createdBy && sop.createdBy.userId === this.userId);
  }

  editSOP(sop: SOP): void {
    if (this.canEditSOP(sop)) {
      this.router.navigate(['/sops', sop._id, 'edit']);
    }
  }

  deleteSOP(sop: SOP): void {
    if (!this.canDeleteSOP(sop)) {
      return;
    }

    if (confirm(`Are you sure you want to delete "${sop.title || 'Untitled SOP'}"? This action cannot be undone.`)) {
      this.sopService.softDeleteSOP(sop._id).subscribe({
        next: () => {
          // Reload SOPs to reflect the deletion
          this.loadSOPs();
        },
        error: (error) => {
          console.error('Error deleting SOP:', error);
          alert('Failed to delete SOP. Please try again.');
        }
      });
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

  // Trash/Bin methods
  loadBinItems(): void {
    this.binLoading = true;
    this.binError = '';

    // Always filter by 'sops' collection
    this.sopService.getBinItems('sops').subscribe({
      next: (response) => {
        this.binItems = response.items;
        this.binLoading = false;
      },
      error: (error) => {
        console.error('Error loading bin items:', error);
        this.binError = 'Failed to load bin items. Please try again.';
        this.binLoading = false;
      }
    });
  }

  filterBinByCollection(collection: string): void {
    this.selectedBinCollection = collection;
    this.loadBinItems();
  }

  restoreBinItem(item: BinItem): void {
    if (!confirm(`Are you sure you want to restore this ${item.collectionName.slice(0, -1)}?`)) {
      return;
    }

    this.sopService.restoreFromBin(item._id).subscribe({
      next: (response) => {
        alert('Item restored successfully!');
        this.loadBinItems(); // Reload the list
        // Also reload SOPs if we're restoring a SOP
        if (item.collectionName === 'sops') {
          this.loadSOPs();
        }
      },
      error: (error) => {
        console.error('Error restoring item:', error);
        alert('Failed to restore item. Please try again.');
      }
    });
  }

  getBinItemTitle(item: BinItem): string {
    if (item.data && item.data.title) {
      return item.data.title;
    }
    return `${item.collectionName.slice(0, -1)} (${item.originalId.substring(0, 8)}...)`;
  }

  getBinItemDescription(item: BinItem): string {
    if (item.data && item.data.description) {
      return item.data.description;
    }
    return 'No description available';
  }

  getBinExpiryWarningClass(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 3) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (daysUntilExpiry <= 7) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border-green-200';
    }
  }

  getBinCollectionIcon(collectionName: string): string {
    switch (collectionName) {
      case 'sops':
        return 'fas fa-file-alt';
      default:
        return 'fas fa-box';
    }
  }

  getBinCollectionColor(collectionName: string): string {
    switch (collectionName) {
      case 'sops':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  }

  getBinDaysRemainingText(days: number): string {
    if (days <= 0) {
      return 'Expiring soon';
    } else if (days === 1) {
      return '1 day remaining';
    } else {
      return `${days} days remaining`;
    }
  }
}
