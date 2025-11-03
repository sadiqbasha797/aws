import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReliabilityService, ReliabilityData, PerformanceStats } from '../services/reliability.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reliability',
  imports: [CommonModule, FormsModule],
  templateUrl: './reliability.html',
  styleUrl: './reliability.css'
})
export class Reliability implements OnInit {
  // Math utility for template
  Math = Math;
  
  // User role and authentication
  userRole: string = '';
  currentUser: any = null;
  
  // Data properties
  reliabilityData: ReliabilityData[] = [];
  performanceStats: PerformanceStats | null = null;
  topPerformers: ReliabilityData[] = [];
  availableTeamMembers: any[] = [];
  availableDaIdsString: string = '';
  
  // UI state
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'overview';
  isInitialized = false;
  showAggregatedView = false;
  selectedTeamMember: any = null;
  teamMemberDetails: ReliabilityData[] = [];
  teamMemberStats: any = null;
  showFilters = false;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;
  pageSize = 10;
  
  // Filters (default to current month and year)
  filters = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1 as number | undefined,
    week: undefined as number | undefined,
    search: '',
    minScore: undefined as number | undefined,
    maxScore: undefined as number | undefined
  };
  
  // Column filters
  columnFilters = {
    selectedDaIds: [] as string[],
    selectedProcesses: [] as string[],
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined
  };
  
  // Filter dropdown visibility
  showDaIdFilter = false;
  showProcessFilter = false;
  showDateFilter = false;
  
  // Search terms for filter dropdowns
  daIdSearchTerm = '';
  processSearchTerm = '';
  
  // Dropdown positions
  daIdFilterPosition = { top: 0, left: 0 };
  processFilterPosition = { top: 0, left: 0 };
  dateFilterPosition = { top: 0, left: 0 };
  
  // Calculation menu
  showCalculationMenu = false;
  calculationResults: any = null;
  selectedCalculationType: string = '';
  
  // All available data for filtering (before column filters)
  allReliabilityData: ReliabilityData[] = [];
  
  // Form for creating/editing reliability data
  reliabilityForm: Partial<ReliabilityData> = {
    workerId: '',
    daId: '',
    processname: '',
    job_id: '',
    totalTasks: 0,
    totalOpportunities: 0,
    totalSegmentsMatching: 0,
    totalLabelMatching: 0,
    totalDefects: 0,
    overallReliabilityScore: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  };
  
  isEditMode = false;
  editingId = '';
  showForm = false;

  constructor(
    private reliabilityService: ReliabilityService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  private initializeComponent() {
    // Determine user role from token
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role || 'user';
        this.currentUser = payload;
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
      }
    }
    
    this.loadInitialData();
  }

  private loadInitialData() {
    if (this.isLoading || this.isInitialized) {
      return; // Prevent multiple simultaneous loads
    }
    
    this.isInitialized = true;
    
    if (this.userRole === 'manager') {
      this.loadManagerData();
    } else {
      this.loadUserData();
    }
  }

  private loadManagerData() {
    this.isLoading = true;
    
    // Prepare filters, excluding undefined values
    const filterParams: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    
    // Only add defined filter values
    if (this.filters.year) filterParams.year = this.filters.year;
    if (this.filters.month) filterParams.month = this.filters.month;
    if (this.filters.week !== undefined) filterParams.week = this.filters.week;
    
    // Load flat list of reliability records
    this.reliabilityService.getAllReliabilityData(filterParams).subscribe({
      next: (allData) => {
        if (allData?.status === 'success' && allData.data?.reliabilityData) {
          let records = allData.data.reliabilityData as ReliabilityData[];
          if (this.filters.week !== undefined) {
            records = records.filter(r => this.getWeekNumber(r.createdAt!) === this.filters.week);
          }
          // Store all records before column filtering
          this.allReliabilityData = records;
          // Apply column filters
          this.applyColumnFilters();
          this.totalRecords = allData.total || 0;
          this.totalPages = allData.pages || 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading manager data:', error);
        this.errorMessage = 'Failed to load reliability data';
        this.isLoading = false;
      }
    });
  }

  private loadUserData() {
    this.isLoading = true;
    
    this.reliabilityService.getMyReliabilityData(
      this.currentPage,
      this.pageSize,
      this.filters.year,
      this.filters.month
    ).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.reliabilityData) {
          let records = response.data.reliabilityData as ReliabilityData[];
          if (this.filters.week !== undefined) {
            records = records.filter(r => this.getWeekNumber(r.createdAt!) === this.filters.week);
          }
          // Store all records before column filtering
          this.allReliabilityData = records;
          // Apply column filters
          this.applyColumnFilters();
          this.totalRecords = response.total || 0;
          this.totalPages = response.pages || 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.errorMessage = 'Failed to load your reliability data';
        this.isLoading = false;
      }
    });
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'overview') {
      this.loadInitialData();
    }
  }

  // Removed view toggle usage; keeping stub to avoid template errors if referenced
  toggleView() {
    this.showAggregatedView = false;
  }

  // Toggle filters visibility
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Team member selection no longer used on simplified page
  selectTeamMember(teamMember: any) {
    return;
  }

  // Go back to team overview
  backToOverview() {
    this.selectedTeamMember = null;
    this.teamMemberDetails = [];
    this.teamMemberStats = null;
  }

  // Load detailed data for a specific team member
  private loadTeamMemberDetails(daId: string) {
    this.isLoading = true;
    
    // Load individual records for this team member
    this.reliabilityService.getAllReliabilityData({
      daId: daId,
      page: 1,
      limit: 50 // Get more records for analysis
    }).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.reliabilityData) {
          this.teamMemberDetails = response.data.reliabilityData;
          this.calculateTeamMemberStats();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading team member details:', error);
        this.errorMessage = 'Failed to load team member details';
        this.isLoading = false;
      }
    });
  }

  // Calculate detailed statistics for the selected team member
  private calculateTeamMemberStats() {
    if (this.teamMemberDetails.length === 0) return;

    const records = this.teamMemberDetails;
    const totalRecords = records.length;
    
    // Calculate averages
    const avgReliability = records.reduce((sum, r) => sum + r.overallReliabilityScore, 0) / totalRecords;
    const avgSegmentAccuracy = records.reduce((sum, r) => sum + (r.segmentAccuracy || 0), 0) / totalRecords;
    const avgLabelAccuracy = records.reduce((sum, r) => sum + (r.labelAccuracy || 0), 0) / totalRecords;
    const avgDefectRate = records.reduce((sum, r) => sum + (r.defectRate || 0), 0) / totalRecords;
    
    // Calculate totals
    const totalTasks = records.reduce((sum, r) => sum + r.totalTasks, 0);
    const totalOpportunities = records.reduce((sum, r) => sum + r.totalOpportunities, 0);
    const totalDefects = records.reduce((sum, r) => sum + r.totalDefects, 0);
    
    // Find best and worst performance
    const bestPerformance = records.reduce((best, current) => 
      current.overallReliabilityScore > best.overallReliabilityScore ? current : best
    );
    const worstPerformance = records.reduce((worst, current) => 
      current.overallReliabilityScore < worst.overallReliabilityScore ? current : worst
    );
    
    // Calculate trend (improvement/decline)
    const sortedByDate = [...records].sort((a, b) => 
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );
    const firstHalf = sortedByDate.slice(0, Math.floor(totalRecords / 2));
    const secondHalf = sortedByDate.slice(Math.floor(totalRecords / 2));
    
    const firstHalfAvg = firstHalf.length > 0 ? 
      firstHalf.reduce((sum, r) => sum + r.overallReliabilityScore, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? 
      secondHalf.reduce((sum, r) => sum + r.overallReliabilityScore, 0) / secondHalf.length : 0;
    
    const trend = secondHalfAvg - firstHalfAvg;
    
    // Get unique processes
    const processes = [...new Set(records.map(r => r.processname))];
    
    this.teamMemberStats = {
      totalRecords,
      avgReliability: Math.round(avgReliability * 100) / 100,
      avgSegmentAccuracy: Math.round(avgSegmentAccuracy * 100) / 100,
      avgLabelAccuracy: Math.round(avgLabelAccuracy * 100) / 100,
      avgDefectRate: Math.round(avgDefectRate * 100) / 100,
      totalTasks,
      totalOpportunities,
      totalDefects,
      bestPerformance,
      worstPerformance,
      trend: Math.round(trend * 100) / 100,
      processes,
      consistencyScore: this.calculateConsistencyScore(records)
    };
  }

  // Calculate consistency score (lower standard deviation = higher consistency)
  private calculateConsistencyScore(records: ReliabilityData[]): number {
    if (records.length < 2) return 100;
    
    const scores = records.map(r => r.overallReliabilityScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to consistency score (0-100, where 100 is most consistent)
    const maxStdDev = 20; // Assume max std dev of 20 points
    const consistencyScore = Math.max(0, 100 - (stdDev / maxStdDev) * 100);
    
    return Math.round(consistencyScore * 100) / 100;
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadInitialData();
    }
  }

  // Filtering
  applyFilters() {
    this.currentPage = 1;
    this.isInitialized = false;
    this.loadInitialData();
    this.showFilters = false; // Auto-close filters after applying
  }

  clearFilters() {
    this.filters = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1 as any,
      week: undefined as any,
      search: '',
      minScore: undefined,
      maxScore: undefined
    };
    this.applyFilters();
  }

  // Show all records regardless of month
  showAll() {
    this.filters.month = undefined as any;
    this.filters.week = undefined as any;
    this.currentPage = 1;
    this.isInitialized = false;
    this.loadInitialData();
  }

  // Reset to current month view
  showCurrentMonth() {
    this.filters.month = new Date().getMonth() + 1;
    this.filters.week = undefined as any;
    this.currentPage = 1;
    this.isInitialized = false;
    this.loadInitialData();
  }

  // Compute ISO week number
  getWeekNumber(date: string | Date): number {
    const d = new Date(date);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  getWeekOptions(): number[] {
    return Array.from({ length: 53 }, (_, i) => i + 1);
  }

  // CRUD operations (Manager only)
  showCreateForm() {
    this.router.navigate(['/reliability/create']);
  }

  editReliabilityData(data: ReliabilityData) {
    this.isEditMode = true;
    this.editingId = data._id || '';
    this.reliabilityForm = { ...data };
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveReliabilityData() {
    if (!this.validateForm()) {
      return;
    }

    if (this.isLoading) {
      return; // Prevent multiple submissions
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const operation = this.isEditMode
      ? this.reliabilityService.updateReliabilityData(this.editingId, this.reliabilityForm)
      : this.reliabilityService.createReliabilityData(this.reliabilityForm as Omit<ReliabilityData, '_id' | 'createdAt' | 'updatedAt'>);

    operation.subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = this.isEditMode ? 'Reliability data updated successfully' : 'Reliability data created successfully';
          this.cancelForm();
          // Use setTimeout to prevent immediate change detection cycle
          setTimeout(() => {
            this.loadInitialData();
          }, 100);
        } else {
          this.errorMessage = response.message || 'Operation failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error saving data:', error);
        this.errorMessage = error.error?.message || 'Failed to save reliability data';
        // Don't reload data on error to prevent infinite loop
      }
    });
  }

  deleteReliabilityData(id: string) {
    if (!confirm('Are you sure you want to delete this reliability data?')) {
      return;
    }

    if (this.isLoading) {
      return; // Prevent multiple deletions
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.reliabilityService.deleteReliabilityData(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = 'Reliability data deleted successfully';
          // Use setTimeout to prevent immediate change detection cycle
          setTimeout(() => {
            this.loadInitialData();
          }, 100);
        } else {
          this.errorMessage = response.message || 'Delete failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error deleting data:', error);
        this.errorMessage = error.error?.message || 'Failed to delete reliability data';
      }
    });
  }

  private validateForm(): boolean {
    if (!this.reliabilityForm.workerId || !this.reliabilityForm.daId || !this.reliabilityForm.processname || !this.reliabilityForm.job_id) {
      this.errorMessage = 'Please fill in all required fields';
      return false;
    }
    
    // Check if DA ID exists in available team members
    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.da_id === this.reliabilityForm.daId)) {
      this.errorMessage = `Invalid DA ID. Available DA IDs: ${this.availableDaIdsString}`;
      return false;
    }
    
    if (this.reliabilityForm.totalOpportunities === 0) {
      this.errorMessage = 'Total opportunities cannot be zero';
      return false;
    }
    
    if ((this.reliabilityForm.overallReliabilityScore || 0) < 0 || (this.reliabilityForm.overallReliabilityScore || 0) > 100) {
      this.errorMessage = 'Overall reliability score must be between 0 and 100';
      return false;
    }
    
    return true;
  }

  // Utility methods
  getPerformanceGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  getGradeColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  getGradeBadgeClass(score: number): string {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  calculateAccuracy(matching: number, total: number): number {
    return total > 0 ? Math.round((matching / total) * 100 * 100) / 100 : 0;
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  // Generate month options for filters
  getMonthOptions() {
    return [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' }
    ];
  }

  // Generate year options for filters
  getYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  }

  // Load team members for DA ID suggestions
  private loadTeamMembers(): Promise<any> {
    return new Promise((resolve) => {
      // Create a simple HTTP request to get team members
      const token = this.authService.getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      fetch('http://localhost:7000/api/team-members/', { headers })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success' && data.data?.teamMembers) {
            this.availableTeamMembers = data.data.teamMembers;
            this.availableDaIdsString = this.availableTeamMembers.map(m => m.da_id).join(', ');
          }
          resolve(data);
        })
        .catch(error => {
          console.error('Error loading team members:', error);
          resolve(null);
        });
    });
  }

  // Get array of page numbers for pagination
  getPaginationPages(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = 1;
    let endPage = this.totalPages;
    
    // Adjust the range to show maxVisiblePages at a time
    if (this.totalPages > maxVisiblePages) {
      const halfMaxVisible = Math.floor(maxVisiblePages / 2);
      startPage = Math.max(1, this.currentPage - halfMaxVisible);
      endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust start page if end page reached the limit
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Column filter methods
  getUniqueDaIds(): string[] {
    const uniqueIds = [...new Set(this.allReliabilityData.map(r => r.daId).filter(id => id))];
    return uniqueIds.sort();
  }

  getFilteredDaIds(): string[] {
    if (!this.daIdSearchTerm) {
      return this.getUniqueDaIds();
    }
    const searchLower = this.daIdSearchTerm.toLowerCase();
    return this.getUniqueDaIds().filter(id => id.toLowerCase().includes(searchLower));
  }

  getUniqueProcesses(): string[] {
    const uniqueProcesses = [...new Set(this.allReliabilityData.map(r => r.processname).filter((p): p is string => !!p))];
    return uniqueProcesses.sort();
  }

  getFilteredProcesses(): string[] {
    if (!this.processSearchTerm) {
      return this.getUniqueProcesses();
    }
    const searchLower = this.processSearchTerm.toLowerCase();
    return this.getUniqueProcesses().filter(p => p.toLowerCase().includes(searchLower));
  }

  toggleDaIdFilter(daId: string) {
    const index = this.columnFilters.selectedDaIds.indexOf(daId);
    if (index > -1) {
      this.columnFilters.selectedDaIds.splice(index, 1);
    } else {
      this.columnFilters.selectedDaIds.push(daId);
    }
    this.applyColumnFilters();
  }

  toggleProcessFilter(process: string) {
    const index = this.columnFilters.selectedProcesses.indexOf(process);
    if (index > -1) {
      this.columnFilters.selectedProcesses.splice(index, 1);
    } else {
      this.columnFilters.selectedProcesses.push(process);
    }
    this.applyColumnFilters();
  }

  isDaIdSelected(daId: string): boolean {
    return this.columnFilters.selectedDaIds.includes(daId);
  }

  isProcessSelected(process: string): boolean {
    return this.columnFilters.selectedProcesses.includes(process);
  }

  clearDaIdFilter() {
    this.columnFilters.selectedDaIds = [];
    this.applyColumnFilters();
  }

  clearProcessFilter() {
    this.columnFilters.selectedProcesses = [];
    this.applyColumnFilters();
  }

  applyDateFilter() {
    this.showDateFilter = false;
    this.applyColumnFilters();
  }

  clearDateFilter() {
    this.columnFilters.dateFrom = undefined;
    this.columnFilters.dateTo = undefined;
    this.applyColumnFilters();
  }

  applyColumnFilters() {
    let filtered = [...this.allReliabilityData];

    // Filter by DA ID
    if (this.columnFilters.selectedDaIds.length > 0) {
      filtered = filtered.filter(r => this.columnFilters.selectedDaIds.includes(r.daId));
    }

    // Filter by Process
    if (this.columnFilters.selectedProcesses.length > 0) {
      filtered = filtered.filter(r => r.processname && this.columnFilters.selectedProcesses.includes(r.processname));
    }

    // Filter by Date Range
    if (this.columnFilters.dateFrom) {
      const fromDate = new Date(this.columnFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.createdAt!);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= fromDate;
      });
    }

    if (this.columnFilters.dateTo) {
      const toDate = new Date(this.columnFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.createdAt!);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate <= toDate;
      });
    }

    this.reliabilityData = filtered;
  }

  hasActiveFilters(): boolean {
    return this.columnFilters.selectedDaIds.length > 0 ||
           this.columnFilters.selectedProcesses.length > 0 ||
           !!this.columnFilters.dateFrom ||
           !!this.columnFilters.dateTo;
  }

  clearAllColumnFilters() {
    this.columnFilters = {
      selectedDaIds: [],
      selectedProcesses: [],
      dateFrom: undefined,
      dateTo: undefined
    };
    this.applyColumnFilters();
  }

  // Close all filter dropdowns
  closeAllFilters() {
    this.showDaIdFilter = false;
    this.showProcessFilter = false;
    this.showDateFilter = false;
  }

  // Calculate dropdown position based on button position
  calculateDropdownPosition(event: MouseEvent, filterType: 'daId' | 'process' | 'date') {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Get dropdown width estimates
    const dropdownWidth = filterType === 'date' ? 280 : 200;
    const dropdownHeight = filterType === 'date' ? 180 : 300; // Estimate
    
    // Get header row for positioning
    const headerRow = button.closest('th');
    const headerRect = headerRow ? headerRow.getBoundingClientRect() : null;
    
    let left: number;
    let top: number;
    
    if (filterType === 'date') {
      // For date popup, align to the right edge of the button (popup opens to the left)
      left = rect.right + scrollLeft - dropdownWidth;
      top = headerRect ? headerRect.bottom + scrollTop + 5 : rect.bottom + scrollTop + 5;
      
      // If popup would go off screen to the left, align with button's left edge
      if (left < scrollLeft + 10) {
        left = rect.left + scrollLeft;
      }
    } else {
      // For other filters, try right side first
      left = rect.right + scrollLeft + 10;
      top = headerRect ? headerRect.bottom + scrollTop + 5 : rect.bottom + scrollTop + 5;
      
      // If no space to the right, position to the left
      if (left + dropdownWidth > window.innerWidth + scrollLeft - 20) {
        left = rect.left + scrollLeft - dropdownWidth - 10;
        // If still off screen, align with button
        if (left < scrollLeft + 10) {
          left = rect.left + scrollLeft;
        }
      }
    }
    
    // Ensure dropdown doesn't go below viewport
    if (top + dropdownHeight > window.innerHeight + scrollTop - 20) {
      top = window.innerHeight + scrollTop - dropdownHeight - 20;
    }
    
    // Ensure dropdown doesn't go above viewport
    if (top < scrollTop + 10) {
      top = scrollTop + 10;
    }
    
    // Ensure dropdown doesn't go off screen horizontally
    if (left + dropdownWidth > window.innerWidth + scrollLeft - 10) {
      left = window.innerWidth + scrollLeft - dropdownWidth - 10;
    }
    if (left < scrollLeft + 10) {
      left = scrollLeft + 10;
    }
    
    const position = {
      top: top,
      left: left
    };
    
    if (filterType === 'daId') {
      this.daIdFilterPosition = position;
    } else if (filterType === 'process') {
      this.processFilterPosition = position;
    } else {
      this.dateFilterPosition = position;
    }
  }

  toggleDaIdFilterMenu(event: MouseEvent) {
    this.calculateDropdownPosition(event, 'daId');
    this.showDaIdFilter = !this.showDaIdFilter;
    this.showProcessFilter = false;
    this.showDateFilter = false;
  }

  toggleProcessFilterMenu(event: MouseEvent) {
    this.calculateDropdownPosition(event, 'process');
    this.showProcessFilter = !this.showProcessFilter;
    this.showDaIdFilter = false;
    this.showDateFilter = false;
  }

  toggleDateFilterMenu(event: MouseEvent) {
    this.calculateDropdownPosition(event, 'date');
    this.showDateFilter = !this.showDateFilter;
    this.showDaIdFilter = false;
    this.showProcessFilter = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Close filters if clicking outside filter elements
    if (!target.closest('.filter-dropdown') && !target.closest('.filter-button')) {
      this.closeAllFilters();
    }
    // Close calculation menu if clicking outside
    if (!target.closest('.calculation-menu') && !target.closest('.calculation-button')) {
      this.showCalculationMenu = false;
    }
  }

  // Calculation methods
  toggleCalculationMenu() {
    this.showCalculationMenu = !this.showCalculationMenu;
  }

  calculateStatistics(type: string) {
    if (this.reliabilityData.length === 0) {
      this.calculationResults = {
        error: 'No data available for calculation'
      };
      return;
    }

    this.selectedCalculationType = type;
    let result: any = { type };

    switch (type) {
      case 'average':
        result = this.calculateAverage();
        break;
      case 'min':
        result = this.calculateMin();
        break;
      case 'max':
        result = this.calculateMax();
        break;
      case 'sum':
        result = this.calculateSum();
        break;
      case 'count':
        result = this.calculateCount();
        break;
      case 'median':
        result = this.calculateMedian();
        break;
      default:
        result = { error: 'Unknown calculation type' };
    }

    this.calculationResults = result;
    this.showCalculationMenu = false;
  }

  calculateAverage() {
    const scores = this.reliabilityData.map(r => r.overallReliabilityScore);
    const tasks = this.reliabilityData.map(r => r.totalTasks);
    const defects = this.reliabilityData.map(r => r.totalDefects);
    
    return {
      type: 'Average',
      overallReliabilityScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      totalTasks: tasks.reduce((a, b) => a + b, 0) / tasks.length,
      totalDefects: defects.reduce((a, b) => a + b, 0) / defects.length,
      recordCount: this.reliabilityData.length
    };
  }

  calculateMin() {
    const scores = this.reliabilityData.map(r => r.overallReliabilityScore);
    const tasks = this.reliabilityData.map(r => r.totalTasks);
    const minScore = Math.min(...scores);
    const minTaskRecord = this.reliabilityData.find(r => r.overallReliabilityScore === minScore);
    
    return {
      type: 'Minimum',
      overallReliabilityScore: minScore,
      totalTasks: Math.min(...tasks),
      record: minTaskRecord,
      recordCount: this.reliabilityData.length
    };
  }

  calculateMax() {
    const scores = this.reliabilityData.map(r => r.overallReliabilityScore);
    const tasks = this.reliabilityData.map(r => r.totalTasks);
    const maxScore = Math.max(...scores);
    const maxTaskRecord = this.reliabilityData.find(r => r.overallReliabilityScore === maxScore);
    
    return {
      type: 'Maximum',
      overallReliabilityScore: maxScore,
      totalTasks: Math.max(...tasks),
      record: maxTaskRecord,
      recordCount: this.reliabilityData.length
    };
  }

  calculateSum() {
    const tasks = this.reliabilityData.map(r => r.totalTasks);
    const defects = this.reliabilityData.map(r => r.totalDefects);
    const opportunities = this.reliabilityData.map(r => r.totalOpportunities);
    
    return {
      type: 'Sum',
      totalTasks: tasks.reduce((a, b) => a + b, 0),
      totalDefects: defects.reduce((a, b) => a + b, 0),
      totalOpportunities: opportunities.reduce((a, b) => a + b, 0),
      recordCount: this.reliabilityData.length
    };
  }

  calculateCount() {
    const uniqueDaIds = new Set(this.reliabilityData.map(r => r.daId)).size;
    const uniqueProcesses = new Set(this.reliabilityData.map(r => r.processname)).size;
    
    return {
      type: 'Count',
      totalRecords: this.reliabilityData.length,
      uniqueDaIds: uniqueDaIds,
      uniqueProcesses: uniqueProcesses
    };
  }

  calculateMedian() {
    const scores = [...this.reliabilityData.map(r => r.overallReliabilityScore)].sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 
      ? scores[mid] 
      : (scores[mid - 1] + scores[mid]) / 2;
    
    return {
      type: 'Median',
      overallReliabilityScore: median,
      recordCount: this.reliabilityData.length
    };
  }

  closeCalculationResults() {
    this.calculationResults = null;
    this.selectedCalculationType = '';
  }

}
