import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  showAggregatedView = true;
  selectedTeamMember: any = null;
  teamMemberDetails: ReliabilityData[] = [];
  teamMemberStats: any = null;
  showFilters = false;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;
  pageSize = 10;
  
  // Filters
  filters = {
    year: new Date().getFullYear(),
    month: undefined as number | undefined,
    search: '',
    minScore: undefined as number | undefined,
    maxScore: undefined as number | undefined
  };
  
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
    private authService: AuthService
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
    if (this.filters.search) filterParams.search = this.filters.search;
    if (this.filters.minScore !== undefined) filterParams.minScore = this.filters.minScore;
    if (this.filters.maxScore !== undefined) filterParams.maxScore = this.filters.maxScore;
    
    // Load all data for manager
    const dataPromise = this.showAggregatedView 
      ? this.reliabilityService.getAggregatedTeamPerformance(filterParams).toPromise()
      : this.reliabilityService.getAllReliabilityData(filterParams).toPromise();
    
    Promise.all([
      dataPromise,
      this.reliabilityService.getPerformanceStats().toPromise(),
      this.reliabilityService.getTopPerformers(5).toPromise(),
      this.loadTeamMembers()
    ]).then(([allData, stats, topPerformers]) => {
      if (allData?.status === 'success' && allData.data?.reliabilityData) {
        this.reliabilityData = allData.data.reliabilityData;
        this.totalRecords = allData.total || 0;
        this.totalPages = allData.pages || 1;
      }
      
      if (stats?.status === 'success' && stats.data?.stats) {
        this.performanceStats = stats.data.stats;
      }
      
      if (topPerformers?.status === 'success' && topPerformers.data?.topPerformers) {
        this.topPerformers = topPerformers.data.topPerformers;
      }
      
      this.isLoading = false;
    }).catch(error => {
      console.error('Error loading manager data:', error);
      this.errorMessage = 'Failed to load reliability data';
      this.isLoading = false;
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
          this.reliabilityData = response.data.reliabilityData;
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

  // Toggle between aggregated and detailed view
  toggleView() {
    this.showAggregatedView = !this.showAggregatedView;
    this.isInitialized = false; // Reset to reload data
    this.loadInitialData();
  }

  // Toggle filters visibility
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Select team member and load their detailed data
  selectTeamMember(teamMember: any) {
    this.selectedTeamMember = teamMember;
    this.loadTeamMemberDetails(teamMember.daId);
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
    this.loadInitialData();
    this.showFilters = false; // Auto-close filters after applying
  }

  clearFilters() {
    this.filters = {
      year: new Date().getFullYear(),
      month: undefined as any,
      search: '',
      minScore: undefined,
      maxScore: undefined
    };
    this.applyFilters();
  }

  // CRUD operations (Manager only)
  showCreateForm() {
    this.isEditMode = false;
    this.editingId = '';
    this.reliabilityForm = {
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
    this.showForm = true;
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

}
