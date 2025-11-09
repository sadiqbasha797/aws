import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ReliabilityService, ReliabilityData, PerformanceStats } from '../services/reliability.service';
import { AuthService } from '../services/auth.service';
import { ProcessService, Process } from '../services/process.service';
import { AuditDocService, AuditDoc } from '../services/audit-doc.service';

interface JobGroup {
  jobId: string;
  records: ReliabilityData[];
  isExpanded: boolean;
}

interface ProcessGroup {
  processName: string;
  jobGroups: JobGroup[];
  isExpanded: boolean;
}

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
  availableProcesses: Process[] = [];
  
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
  
  // Filters (default to no month filter - show all data)
  filters = {
    year: new Date().getFullYear(),
    month: undefined as number | undefined,
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
  
  // Hierarchical data structure
  processGroups: ProcessGroup[] = [];
  expandedProcesses: Set<string> = new Set();
  expandedJobIds: Set<string> = new Set();
  
  // View state - 'processes', 'jobIds', 'records', 'allRecords'
  currentView: 'processes' | 'jobIds' | 'records' | 'allRecords' = 'processes';
  selectedProcessForView: ProcessGroup | null = null;
  selectedJobGroupForView: JobGroup | null = null;
  showAllRecordsTable = false;
  
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

  // Audit Docs properties
  auditDocs: AuditDoc[] = [];
  auditDocPage = 1;
  auditDocTotalPages = 1;
  auditDocTotalRecords = 0;
  auditDocSearch = '';

  constructor(
    private reliabilityService: ReliabilityService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private processService: ProcessService,
    private auditDocService: AuditDocService
  ) {}

  ngOnInit() {
    this.initializeComponent();
    
    // Check for query params to set active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'audit-docs' && this.userRole === 'manager') {
        this.activeTab = 'audit-docs';
        this.loadAuditDocs();
      }
    });
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
    if (this.userRole === 'manager') {
      this.loadAuditDocs();
    }
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
    
    // If showing all (no month filter), load all records
    if (!this.filters.month) {
      // Prepare filters for loading all records
      const filterParams: any = {
        page: 1,
        limit: 10000 // Large limit to get all records
      };
      
      // Only add defined filter values
      if (this.filters.year) filterParams.year = this.filters.year;
      // Don't add month filter when showing all
      
      // Load all reliability records
      this.reliabilityService.getAllReliabilityData(filterParams).subscribe({
        next: (allData) => {
          if (allData?.status === 'success' && allData.data?.reliabilityData) {
            let records = allData.data.reliabilityData as ReliabilityData[];
            if (this.filters.week !== undefined) {
              records = records.filter(r => this.getWeekNumber(r.createdAt!) === this.filters.week);
            }
            // Store all records before column filtering
            this.allReliabilityData = records;
            // Apply column filters (which also builds hierarchical structure)
            this.applyColumnFilters();
            this.totalRecords = records.length;
            this.totalPages = 1; // Single page when showing all
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading all manager data:', error);
          this.errorMessage = 'Failed to load reliability data';
          this.isLoading = false;
        }
      });
    } else {
      // Normal paginated load when month filter is set
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
            // Apply column filters (which also builds hierarchical structure)
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
  }

  private loadUserData() {
    this.isLoading = true;
    
    // If showing all (no month filter), load all records
    if (!this.filters.month) {
      this.reliabilityService.getMyReliabilityData(
        1,
        10000, // Large limit to get all records
        this.filters.year,
        undefined // No month filter
      ).subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data?.reliabilityData) {
            let records = response.data.reliabilityData as ReliabilityData[];
            if (this.filters.week !== undefined) {
              records = records.filter(r => this.getWeekNumber(r.createdAt!) === this.filters.week);
            }
            // Store all records before column filtering
            this.allReliabilityData = records;
            // Apply column filters (which also builds hierarchical structure)
            this.applyColumnFilters();
            this.totalRecords = records.length;
            this.totalPages = 1; // Single page when showing all
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user data:', error);
          this.errorMessage = 'Failed to load your reliability data';
          this.isLoading = false;
        }
      });
    } else {
      // Normal paginated load when month filter is set
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
            // Apply column filters (which also builds hierarchical structure)
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
  }

  // Tab management
  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'overview') {
      this.loadInitialData();
    } else if (tab === 'audit-docs' && this.userRole === 'manager') {
      this.loadAuditDocs();
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
    this.showAllRecordsTable = true; // Show all records in table view
    // loadInitialData will handle loading all records when month filter is undefined
    this.loadInitialData();
  }

  // Reset to current month view
  showCurrentMonth() {
    this.filters.month = new Date().getMonth() + 1;
    this.filters.week = undefined as any;
    this.currentPage = 1;
    this.isInitialized = false;
    this.showAllRecordsTable = false; // Go back to hierarchical view
    this.currentView = 'processes'; // Reset to processes view
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
    // Navigate to separate create page
    this.router.navigate(['/reliability/create']);
  }

  editReliabilityData(data: ReliabilityData) {
    this.isEditMode = true;
    this.editingId = data._id || '';
    this.reliabilityForm = { ...data };
    this.showForm = true;
    // Load team members if not already loaded
    if (this.availableTeamMembers.length === 0) {
      this.loadTeamMembers();
    }
    // Load processes if not already loaded
    if (this.availableProcesses.length === 0) {
      this.loadProcesses();
    }
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
            // Refresh view data if open
            if (this.currentView === 'records' && this.selectedJobGroupForView) {
              const processName = this.selectedProcessForView?.processName;
              const jobId = this.selectedJobGroupForView.jobId;
              if (processName) {
                // Reload the job group data
                const processGroup = this.processGroups.find(p => p.processName === processName);
                if (processGroup) {
                  const jobGroup = processGroup.jobGroups.find(j => j.jobId === jobId);
                  if (jobGroup) {
                    this.selectedJobGroupForView = jobGroup;
                  }
                }
              }
            }
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
            // Refresh view data if open
            if (this.currentView === 'records' && this.selectedJobGroupForView) {
              const processName = this.selectedProcessForView?.processName;
              const jobId = this.selectedJobGroupForView.jobId;
              if (processName) {
                // Reload the job group data
                const processGroup = this.processGroups.find(p => p.processName === processName);
                if (processGroup) {
                  const jobGroup = processGroup.jobGroups.find(j => j.jobId === jobId);
                  if (jobGroup) {
                    this.selectedJobGroupForView = jobGroup;
                    // If no records left, go back to job IDs view
                    if (jobGroup.records.length === 0) {
                      this.backToJobIds();
                    }
                  }
                }
              }
            }
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

  // Load processes from database
  private loadProcesses() {
    this.processService.getAllProcesses({ limit: 1000 }).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.processes) {
          this.availableProcesses = response.data.processes;
          // Sort processes by name
          this.availableProcesses.sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: (error) => {
        console.error('Error loading processes:', error);
        this.errorMessage = 'Failed to load processes';
      }
    });
  }

  // Get available process names for dropdown
  getAvailableProcessNames(): string[] {
    const processNames = this.availableProcesses.map(p => p.name);
    // If editing and current process name is not in the list, add it
    if (this.isEditMode && this.reliabilityForm.processname && !processNames.includes(this.reliabilityForm.processname)) {
      return [...processNames, this.reliabilityForm.processname].sort();
    }
    return processNames;
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
    // Build hierarchical structure
    this.buildHierarchicalStructure();
    
    // If showAllRecordsTable is true, switch to all records view
    if (this.showAllRecordsTable && this.reliabilityData.length > 0) {
      this.currentView = 'allRecords';
    }
  }

  buildHierarchicalStructure() {
    const processMap = new Map<string, Map<string, ReliabilityData[]>>();
    
    // Group data by process and job_id
    this.reliabilityData.forEach(record => {
      const processName = record.processname || 'Unknown Process';
      const jobId = record.job_id || 'Unknown Job';
      
      if (!processMap.has(processName)) {
        processMap.set(processName, new Map());
      }
      
      const jobMap = processMap.get(processName)!;
      if (!jobMap.has(jobId)) {
        jobMap.set(jobId, []);
      }
      
      jobMap.get(jobId)!.push(record);
    });
    
    // Build ProcessGroup array
    this.processGroups = Array.from(processMap.entries()).map(([processName, jobMap]) => {
      const jobGroups: JobGroup[] = Array.from(jobMap.entries()).map(([jobId, records]) => {
        const uniqueKey = `${processName}||${jobId}`;
        return {
          jobId,
          records,
          isExpanded: this.expandedJobIds.has(uniqueKey)
        };
      });
      
      return {
        processName,
        jobGroups,
        isExpanded: this.expandedProcesses.has(processName)
      };
    });
    
    // Sort processes alphabetically
    this.processGroups.sort((a, b) => a.processName.localeCompare(b.processName));
    
    // Sort job IDs within each process
    this.processGroups.forEach(process => {
      process.jobGroups.sort((a, b) => a.jobId.localeCompare(b.jobId));
    });
  }

  toggleProcess(processName: string) {
    // Show job IDs view for this process
    const processGroup = this.processGroups.find(p => p.processName === processName);
    if (processGroup) {
      this.selectedProcessForView = processGroup;
      this.currentView = 'jobIds';
    }
  }

  toggleJobId(processName: string, jobId: string) {
    // Show records view for this job ID
    const processGroup = this.processGroups.find(p => p.processName === processName);
    if (processGroup) {
      const jobGroup = processGroup.jobGroups.find(j => j.jobId === jobId);
      if (jobGroup) {
        this.selectedJobGroupForView = jobGroup;
        this.selectedProcessForView = processGroup; // Keep process context
        this.currentView = 'records';
      }
    }
  }

  backToProcesses() {
    // Go back to processes view
    this.currentView = 'processes';
    this.selectedProcessForView = null;
    this.selectedJobGroupForView = null;
  }

  backToJobIds() {
    // Go back to job IDs view
    this.currentView = 'jobIds';
    this.selectedJobGroupForView = null;
  }

  isProcessExpanded(processName: string): boolean {
    return this.expandedProcesses.has(processName);
  }

  isJobIdExpanded(processName: string, jobId: string): boolean {
    const uniqueKey = `${processName}||${jobId}`;
    return this.expandedJobIds.has(uniqueKey);
  }

  getTotalRecordsForProcess(processGroup: ProcessGroup): number {
    return processGroup.jobGroups.reduce((sum, j) => sum + j.records.length, 0);
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
    
    // Get dropdown width estimates
    const dropdownWidth = filterType === 'date' ? 280 : 200;
    const dropdownHeight = filterType === 'date' ? 180 : 300; // Estimate
    
    // Get header row for positioning
    const headerRow = button.closest('th');
    const headerRect = headerRow ? headerRow.getBoundingClientRect() : null;
    
    let left: number;
    let top: number;
    
    // For fixed positioning, use viewport coordinates directly (getBoundingClientRect gives viewport coords)
    if (filterType === 'date') {
      // For date popup, align to the right edge of the button (popup opens to the left)
      left = rect.right - dropdownWidth;
      top = headerRect ? headerRect.bottom + 5 : rect.bottom + 5;
      
      // If popup would go off screen to the left, align with button's left edge
      if (left < 10) {
        left = rect.left;
      }
    } else {
      // For other filters, try right side first
      left = rect.right + 10;
      top = headerRect ? headerRect.bottom + 5 : rect.bottom + 5;
      
      // If no space to the right, position to the left
      if (left + dropdownWidth > window.innerWidth - 20) {
        left = rect.left - dropdownWidth - 10;
        // If still off screen, align with button
        if (left < 10) {
          left = rect.left;
        }
      }
    }
    
    // Ensure dropdown doesn't go below viewport
    if (top + dropdownHeight > window.innerHeight - 20) {
      top = window.innerHeight - dropdownHeight - 20;
    }
    
    // Ensure dropdown doesn't go above viewport
    if (top < 10) {
      top = 10;
    }
    
    // Ensure dropdown doesn't go off screen horizontally
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    if (left < 10) {
      left = 10;
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
    if (event) {
      event.stopPropagation(); // Prevent document click from closing immediately
    }
    this.calculateDropdownPosition(event, 'daId');
    const wasOpen = this.showDaIdFilter;
    this.showDaIdFilter = !wasOpen;
    if (!wasOpen) {
      // Only close others when opening this one
      this.showProcessFilter = false;
      this.showDateFilter = false;
    }
  }

  toggleProcessFilterMenu(event: MouseEvent) {
    if (event) {
      event.stopPropagation(); // Prevent document click from closing immediately
    }
    this.calculateDropdownPosition(event, 'process');
    const wasOpen = this.showProcessFilter;
    this.showProcessFilter = !wasOpen;
    if (!wasOpen) {
      // Only close others when opening this one
      this.showDaIdFilter = false;
      this.showDateFilter = false;
    }
  }

  toggleDateFilterMenu(event: MouseEvent) {
    if (event) {
      event.stopPropagation(); // Prevent document click from closing immediately
    }
    this.calculateDropdownPosition(event, 'date');
    const wasOpen = this.showDateFilter;
    this.showDateFilter = !wasOpen;
    if (!wasOpen) {
      // Only close others when opening this one
      this.showDaIdFilter = false;
      this.showProcessFilter = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Close filters if clicking outside filter elements
    // Check if click is outside both the dropdown and the button
    const isInsideFilter = target.closest('.filter-dropdown') || target.closest('.filter-button');
    if (!isInsideFilter) {
      this.closeAllFilters();
    }
    // Close calculation menu if clicking outside
    if (!target.closest('.calculation-menu') && !target.closest('.calculation-button')) {
      this.showCalculationMenu = false;
    }
  }

  // Get data for current view
  getCurrentViewData(): ReliabilityData[] {
    if (this.currentView === 'records' && this.selectedJobGroupForView) {
      // Return records for the selected job ID
      return this.selectedJobGroupForView.records;
    } else if (this.currentView === 'jobIds' && this.selectedProcessForView) {
      // Return all records for the selected process
      return this.selectedProcessForView.jobGroups.flatMap(jobGroup => jobGroup.records);
    } else {
      // Return all data (processes view)
      return this.reliabilityData;
    }
  }

  // Get calculation context description
  getCalculationContext(): string {
    if (this.currentView === 'records' && this.selectedJobGroupForView && this.selectedProcessForView) {
      return `Job ID: ${this.selectedJobGroupForView.jobId} (${this.selectedProcessForView.processName})`;
    } else if (this.currentView === 'jobIds' && this.selectedProcessForView) {
      return `Process: ${this.selectedProcessForView.processName}`;
    } else {
      return 'All Processes';
    }
  }

  // Calculation methods
  toggleCalculationMenu() {
    this.showCalculationMenu = !this.showCalculationMenu;
  }

  calculateStatistics(type: string) {
    const currentData = this.getCurrentViewData();
    
    if (currentData.length === 0) {
      this.calculationResults = {
        error: 'No data available for calculation'
      };
      return;
    }

    this.selectedCalculationType = type;
    let result: any = { type };

    switch (type) {
      case 'average':
        result = this.calculateAverage(currentData);
        break;
      case 'min':
        result = this.calculateMin(currentData);
        break;
      case 'max':
        result = this.calculateMax(currentData);
        break;
      case 'sum':
        result = this.calculateSum(currentData);
        break;
      case 'count':
        result = this.calculateCount(currentData);
        break;
      case 'median':
        result = this.calculateMedian(currentData);
        break;
      default:
        result = { error: 'Unknown calculation type' };
    }

    this.calculationResults = result;
    this.showCalculationMenu = false;
  }

  calculateAverage(data: ReliabilityData[]) {
    const scores = data.map(r => r.overallReliabilityScore);
    const tasks = data.map(r => r.totalTasks);
    const defects = data.map(r => r.totalDefects);
    
    return {
      type: 'Average',
      overallReliabilityScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      totalTasks: tasks.reduce((a, b) => a + b, 0) / tasks.length,
      totalDefects: defects.reduce((a, b) => a + b, 0) / defects.length,
      recordCount: data.length
    };
  }

  calculateMin(data: ReliabilityData[]) {
    const scores = data.map(r => r.overallReliabilityScore);
    const tasks = data.map(r => r.totalTasks);
    const minScore = Math.min(...scores);
    const minTaskRecord = data.find(r => r.overallReliabilityScore === minScore);
    
    return {
      type: 'Minimum',
      overallReliabilityScore: minScore,
      totalTasks: Math.min(...tasks),
      record: minTaskRecord,
      recordCount: data.length
    };
  }

  calculateMax(data: ReliabilityData[]) {
    const scores = data.map(r => r.overallReliabilityScore);
    const tasks = data.map(r => r.totalTasks);
    const maxScore = Math.max(...scores);
    const maxTaskRecord = data.find(r => r.overallReliabilityScore === maxScore);
    
    return {
      type: 'Maximum',
      overallReliabilityScore: maxScore,
      totalTasks: Math.max(...tasks),
      record: maxTaskRecord,
      recordCount: data.length
    };
  }

  calculateSum(data: ReliabilityData[]) {
    const tasks = data.map(r => r.totalTasks);
    const defects = data.map(r => r.totalDefects);
    const opportunities = data.map(r => r.totalOpportunities);
    
    return {
      type: 'Sum',
      totalTasks: tasks.reduce((a, b) => a + b, 0),
      totalDefects: defects.reduce((a, b) => a + b, 0),
      totalOpportunities: opportunities.reduce((a, b) => a + b, 0),
      recordCount: data.length
    };
  }

  calculateCount(data: ReliabilityData[]) {
    const uniqueDaIds = new Set(data.map(r => r.daId)).size;
    const uniqueProcesses = new Set(data.map(r => r.processname)).size;
    
    return {
      type: 'Count',
      totalRecords: data.length,
      uniqueDaIds: uniqueDaIds,
      uniqueProcesses: uniqueProcesses
    };
  }

  calculateMedian(data: ReliabilityData[]) {
    const scores = [...data.map(r => r.overallReliabilityScore)].sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 !== 0 
      ? scores[mid] 
      : (scores[mid - 1] + scores[mid]) / 2;
    
    return {
      type: 'Median',
      overallReliabilityScore: median,
      recordCount: data.length
    };
  }

  closeCalculationResults() {
    this.calculationResults = null;
    this.selectedCalculationType = '';
  }

  // Audit Docs methods
  loadAuditDocs() {
    if (this.userRole !== 'manager') return;
    
    this.isLoading = true;
    const params: any = {
      page: this.auditDocPage,
      limit: this.pageSize
    };
    
    if (this.auditDocSearch) {
      params.search = this.auditDocSearch;
    }

    this.auditDocService.getAllAuditDocs(params).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.auditDocs) {
          this.auditDocs = response.data.auditDocs;
          this.auditDocTotalRecords = response.total || 0;
          this.auditDocTotalPages = response.pages || 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading audit docs:', error);
        this.errorMessage = 'Failed to load audit documents';
        this.isLoading = false;
      }
    });
  }

  showCreateAuditDocForm() {
    // Navigate to separate create page
    this.router.navigate(['/audit-docs/create']);
  }

  editAuditDoc(auditDoc: AuditDoc) {
    // Navigate to separate edit page
    this.router.navigate(['/audit-docs', auditDoc._id, 'edit']);
  }


  deleteAuditDoc(id: string) {
    if (!confirm('Are you sure you want to delete this audit document?')) {
      return;
    }

    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auditDocService.deleteAuditDoc(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = 'Audit document deleted successfully';
          setTimeout(() => {
            this.loadAuditDocs();
          }, 100);
        } else {
          this.errorMessage = response.message || 'Delete failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error deleting audit doc:', error);
        this.errorMessage = error.error?.message || 'Failed to delete audit document';
      }
    });
  }

  goToAuditDocPage(page: number) {
    if (page >= 1 && page <= this.auditDocTotalPages) {
      this.auditDocPage = page;
      this.loadAuditDocs();
    }
  }

  searchAuditDocs() {
    this.auditDocPage = 1;
    this.loadAuditDocs();
  }

  clearAuditDocSearch() {
    this.auditDocSearch = '';
    this.auditDocPage = 1;
    this.loadAuditDocs();
  }

  formatAuditDocDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatAuditDocTimestamp(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAuditDocPaginationPages(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = 1;
    let endPage = this.auditDocTotalPages;
    
    if (this.auditDocTotalPages > maxVisiblePages) {
      const halfMaxVisible = Math.floor(maxVisiblePages / 2);
      startPage = Math.max(1, this.auditDocPage - halfMaxVisible);
      endPage = Math.min(this.auditDocTotalPages, startPage + maxVisiblePages - 1);
      
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



