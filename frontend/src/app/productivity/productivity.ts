import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductivityService, ProductivityData, ProductivityStats } from '../services/productivity.service';
import { AuthService } from '../services/auth.service';
import { TeamMemberService } from '../services/team-member.service';

@Component({
  selector: 'app-productivity',
  imports: [CommonModule, FormsModule],
  templateUrl: './productivity.html',
  styleUrl: './productivity.css'
})
export class Productivity implements OnInit {
  // Math utility for template
  Math = Math;
  
  // User role and authentication
  userRole: string = '';
  currentUser: any = null;
  
  // Data properties
  productivityData: ProductivityData[] = [];
  productivityStats: ProductivityStats | null = null;
  topPerformers: ProductivityData[] = [];
  availableTeamMembers: any[] = [];
  availableTeamMembersString: string = '';
  isLoadingTeamMembers = false;
  
  // Static options to prevent infinite change detection
  monthOptions = [
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];
  
  weekOptions: number[] = Array.from({ length: 53 }, (_, i) => i + 1);
  
  yearOptions: number[] = [];
  
  performanceCategoryOptions = [
    { value: 'Excellent', label: 'Excellent' },
    { value: 'Good', label: 'Good' },
    { value: 'Average', label: 'Average' },
    { value: 'Below Average', label: 'Below Average' },
    { value: 'Poor', label: 'Poor' }
  ];
  
  // UI state
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'overview';
  showAggregatedView = false;
  selectedTeamMember: any = null;
  teamMemberDetails: ProductivityData[] = [];
  teamMemberStats: any = null;
  showFilters = false;
  
  // Calendar view state
  calendarView: 'year' | 'week' | 'all' = 'year';
  selectedYear: number = new Date().getFullYear();
  selectedWeek: number | null = null;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;
  pageSize = 10;
  
  // Filters (default to current month)
  filters = {
    year: new Date().getFullYear(),
    month: this.getCurrentMonth() as string | undefined,
    week: undefined as number | undefined,
    search: '',
    minProductivity: undefined as number | undefined,
    maxProductivity: undefined as number | undefined,
    performanceCategory: undefined as string | undefined
  };
  
  // Column filters
  columnFilters = {
    selectedAssociates: [] as string[],
    dateFrom: undefined as string | undefined,
    dateTo: undefined as string | undefined
  };
  
  // Filter dropdown visibility
  showAssociateFilter = false;
  showDateFilter = false;
  
  // Search terms for filter dropdowns
  associateSearchTerm = '';
  
  // Dropdown positions
  associateFilterPosition = { top: 0, left: 0 };
  dateFilterPosition = { top: 0, left: 0 };
  
  // Calculation menu
  showCalculationMenu = false;
  calculationResults: any = null;
  selectedCalculationType: string = '';
  
  // All available data for filtering (before column filters)
  allProductivityData: ProductivityData[] = [];
  
  // Form for creating/editing productivity data
  productivityForm: Partial<ProductivityData> = {
    teamManager: '',
    associateName: '',
    month: '',
    week: '',
    productivityPercentage: 0,
    year: new Date().getFullYear(),
    notes: ''
  };
  
  isEditMode = false;
  editingId = '';
  showForm = false;

  constructor(
    private productivityService: ProductivityService,
    private authService: AuthService,
    private teamMemberService: TeamMemberService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeYearOptions();
    // Initialize calendar view first
    this.calendarView = 'year';
    this.selectedYear = new Date().getFullYear();
    this.loadWeeksForYear();
    // Then initialize component (which may try to load data, but will be blocked by calendar view check)
    this.initializeComponent();
  }

  private initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    this.yearOptions = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      this.yearOptions.push(i);
    }
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
    // Only load data if we're not in calendar view mode (year)
    // Calendar view will load data when a week is selected or "Show All" is clicked
    if (this.calendarView === 'year') {
      return;
    }
    
    // If in 'all' view, load all data
    if (this.calendarView === 'all') {
      this.loadAllProductivityData();
      return;
    }
    
    if (this.isLoading) {
      return; // Prevent multiple simultaneous loads
    }
    
    this.isLoading = true;
    
    if (this.userRole === 'manager') {
      this.loadManagerData();
    } else {
      this.loadUserData();
    }
  }

  private loadManagerData() {
    // isLoading is already set in loadInitialData()
    
    // If showing all (no month filter), load all records with large limit
    const isShowingAll = !this.filters.month;
    
    // Prepare filters, excluding undefined values
    const filterParams: any = {
      page: isShowingAll ? 1 : this.currentPage,
      limit: isShowingAll ? 10000 : this.pageSize // Large limit when showing all
    };
    
    // Only add defined filter values
    if (this.filters.year) filterParams.year = this.filters.year;
    if (this.filters.month) filterParams.month = this.filters.month;
    if (this.filters.search) filterParams.search = this.filters.search;
    if (this.filters.minProductivity !== undefined) filterParams.minProductivity = this.filters.minProductivity;
    if (this.filters.maxProductivity !== undefined) filterParams.maxProductivity = this.filters.maxProductivity;
    if (this.filters.performanceCategory) filterParams.performanceCategory = this.filters.performanceCategory;
    
    // Load all data for manager
    const dataObservable = this.showAggregatedView 
      ? this.productivityService.getAggregatedTeamPerformance(filterParams)
      : this.productivityService.getAllProductivityData(filterParams);
    
    // Load data sequentially to avoid race conditions
    dataObservable.subscribe({
      next: (allData) => {
        if (allData?.status === 'success' && allData.data?.productivityData) {
          let records = allData.data.productivityData as ProductivityData[];
          if (this.filters.week !== undefined) {
            records = records.filter(r => this.getWeekFromData(r) === this.filters.week);
          }
          // Store all records before column filtering
          this.allProductivityData = records;
          // Apply column filters
          this.applyColumnFilters();
          if (isShowingAll) {
            this.totalRecords = records.length;
            this.totalPages = 1; // Single page when showing all
          } else {
            this.totalRecords = allData.total || 0;
            this.totalPages = allData.pages || 1;
          }
        }
        
        // Load stats
        this.productivityService.getProductivityStats(this.filters.year, this.filters.month).subscribe({
          next: (stats) => {
            if (stats?.status === 'success' && stats.data?.stats) {
              this.productivityStats = stats.data.stats;
            }
            
            // Load top performers
            this.productivityService.getTopPerformers(5, this.filters.year, this.filters.month).subscribe({
              next: (topPerformers) => {
                if (topPerformers?.status === 'success' && topPerformers.data?.topPerformers) {
                  this.topPerformers = topPerformers.data.topPerformers;
                }
                
                // Load team members
                this.loadTeamMembers().then(() => {
                  this.isLoading = false;
                });
              },
              error: (error) => {
                console.error('Error loading top performers:', error);
                this.isLoading = false;
              }
            });
          },
          error: (error) => {
            console.error('Error loading stats:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading manager data:', error);
        this.errorMessage = 'Failed to load productivity data';
        this.isLoading = false;
      }
    });
  }

  private loadUserData() {
    // isLoading is already set in loadInitialData()
    
    // If showing all (no month filter), load all records with large limit
    const isShowingAll = !this.filters.month;
    
    this.productivityService.getMyProductivityData(
      isShowingAll ? 1 : this.currentPage,
      isShowingAll ? 10000 : this.pageSize, // Large limit when showing all
      this.filters.year,
      this.filters.month,
      undefined
    ).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.productivityData) {
          let records = response.data.productivityData as ProductivityData[];
          if (this.filters.week !== undefined) {
            records = records.filter(r => this.getWeekFromData(r) === this.filters.week);
          }
          // Store all records before column filtering
          this.allProductivityData = records;
          // Apply column filters
          this.applyColumnFilters();
          if (isShowingAll) {
            this.totalRecords = records.length;
            this.totalPages = 1; // Single page when showing all
          } else {
            this.totalRecords = response.total || 0;
            this.totalPages = response.pages || 1;
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.errorMessage = 'Failed to load your productivity data';
        this.isLoading = false;
      }
    });
  }

  // Toggle filters visibility
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Toggle between aggregated and detailed view
  toggleView() {
    this.showAggregatedView = !this.showAggregatedView;
    this.currentPage = 1; // Reset pagination
    this.loadInitialData();
  }

  // Select team member and load their detailed data
  selectTeamMember(teamMember: any) {
    this.selectedTeamMember = teamMember;
    this.loadTeamMemberDetails(teamMember.associateName);
  }

  // Go back to team overview
  backToOverview() {
    this.selectedTeamMember = null;
    this.teamMemberDetails = [];
    this.teamMemberStats = null;
  }

  // Load detailed data for a specific team member
  private loadTeamMemberDetails(associateName: string) {
    this.isLoading = true;
    
    // Load individual records for this team member
    this.productivityService.getAllProductivityData({
      associateName: associateName,
      page: 1,
      limit: 50 // Get more records for analysis
    }).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.productivityData) {
          this.teamMemberDetails = response.data.productivityData;
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
    const avgProductivity = records.reduce((sum, r) => sum + r.productivityPercentage, 0) / totalRecords;
    
    // Find best and worst performance
    const bestPerformance = records.reduce((best, current) => 
      current.productivityPercentage > best.productivityPercentage ? current : best
    );
    const worstPerformance = records.reduce((worst, current) => 
      current.productivityPercentage < worst.productivityPercentage ? current : worst
    );
    
    // Calculate trend (improvement/decline)
    const sortedByDate = [...records].sort((a, b) => 
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );
    const firstHalf = sortedByDate.slice(0, Math.floor(totalRecords / 2));
    const secondHalf = sortedByDate.slice(Math.floor(totalRecords / 2));
    
    const firstHalfAvg = firstHalf.length > 0 ? 
      firstHalf.reduce((sum, r) => sum + r.productivityPercentage, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? 
      secondHalf.reduce((sum, r) => sum + r.productivityPercentage, 0) / secondHalf.length : 0;
    
    const trend = secondHalfAvg - firstHalfAvg;
    
    // Get unique weeks and months
    const weeks = [...new Set(records.map(r => r.week))];
    const months = [...new Set(records.map(r => r.month))];
    
    // Calculate performance categories
    const aboveTarget = records.filter(r => r.productivityPercentage >= 100).length;
    const onTarget = records.filter(r => r.productivityPercentage >= 80 && r.productivityPercentage < 100).length;
    const belowTarget = records.filter(r => r.productivityPercentage < 80).length;
    
    this.teamMemberStats = {
      totalRecords,
      avgProductivity: Math.round(avgProductivity * 100) / 100,
      bestPerformance,
      worstPerformance,
      trend: Math.round(trend * 100) / 100,
      weeks,
      months,
      aboveTarget,
      onTarget,
      belowTarget,
      consistencyScore: this.calculateConsistencyScore(records)
    };
  }

  // Calculate consistency score (lower standard deviation = higher consistency)
  private calculateConsistencyScore(records: ProductivityData[]): number {
    if (records.length < 2) return 100;
    
    const scores = records.map(r => r.productivityPercentage);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to consistency score (0-100, where 100 is most consistent)
    const maxStdDev = 30; // Assume max std dev of 30 points for productivity
    const consistencyScore = Math.max(0, 100 - (stdDev / maxStdDev) * 100);
    
    return Math.round(consistencyScore * 100) / 100;
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      if (this.calendarView === 'all') {
        this.loadAllProductivityData();
      } else {
        this.loadInitialData();
      }
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
      month: this.getCurrentMonth(),
      week: undefined,
      search: '',
      minProductivity: undefined,
      maxProductivity: undefined,
      performanceCategory: undefined
    };
    this.applyFilters();
  }

  // Show all (clear month and week)
  showAll() {
    this.filters.month = undefined;
    this.filters.week = undefined;
    this.currentPage = 1;
    this.loadInitialData();
  }

  // Current month view
  showCurrentMonth() {
    this.filters.month = this.getCurrentMonth();
    this.filters.week = undefined;
    this.currentPage = 1;
    this.loadInitialData();
  }

  // CRUD operations (Manager only)
  showCreateForm() {
    this.router.navigate(['/productivity/create']);
  }

  // Retry loading team members
  retryLoadTeamMembers() {
    this.errorMessage = '';
    this.loadTeamMembers();
  }

  editProductivityData(data: ProductivityData) {
    this.isEditMode = true;
    this.editingId = data._id || '';
    this.productivityForm = { ...data };
    this.showForm = true;
    // Load team members if not already loaded
    if (this.availableTeamMembers.length === 0) {
      this.loadTeamMembers();
    }
  }

  cancelForm() {
    this.showForm = false;
    this.isEditMode = false;
    this.editingId = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveProductivityData() {
    console.log('saveProductivityData called');
    console.log('Form data:', this.productivityForm);
    console.log('Available team members:', this.availableTeamMembers);
    
    if (!this.validateForm()) {
      console.log('Form validation failed');
      return;
    }

    if (this.isLoading) {
      console.log('Already loading, preventing multiple submissions');
      return; // Prevent multiple submissions
    }

    console.log('Starting form submission...');
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const operation = this.isEditMode
      ? this.productivityService.updateProductivityData(this.editingId, this.productivityForm)
      : this.productivityService.createProductivityData(this.productivityForm as Omit<ProductivityData, '_id' | 'createdAt' | 'updatedAt'>);

    operation.subscribe({
      next: (response) => {
        console.log('Response received:', response);
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = this.isEditMode ? 'Productivity data updated successfully' : 'Productivity data created successfully';
          this.cancelForm();
          this.loadInitialData();
        } else {
          this.errorMessage = response.message || 'Operation failed';
        }
      },
      error: (error) => {
        console.error('Error saving data:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to save productivity data';
        // Don't reload data on error to prevent infinite loop
      }
    });
  }

  deleteProductivityData(id: string) {
    if (!confirm('Are you sure you want to delete this productivity data?')) {
      return;
    }

    if (this.isLoading) {
      return; // Prevent multiple deletions
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.productivityService.deleteProductivityData(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.successMessage = 'Productivity data deleted successfully';
          this.loadInitialData();
        } else {
          this.errorMessage = response.message || 'Delete failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error deleting data:', error);
        this.errorMessage = error.error?.message || 'Failed to delete productivity data';
      }
    });
  }

  private validateForm(): boolean {
    console.log('Validating form...');
    console.log('Form fields:', {
      associateName: this.productivityForm.associateName,
      month: this.productivityForm.month,
      week: this.productivityForm.week,
      productivityPercentage: this.productivityForm.productivityPercentage
    });
    
    if (!this.productivityForm.associateName || !this.productivityForm.month || !this.productivityForm.week) {
      console.log('Missing required fields');
      this.errorMessage = 'Please fill in all required fields';
      return false;
    }
    
    // Check if associate name exists in available team members
    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.name === this.productivityForm.associateName)) {
      console.log('Associate name not found in available team members');
      this.errorMessage = 'Please select a valid associate from the dropdown';
      return false;
    }
    
    if ((this.productivityForm.productivityPercentage || 0) < 0 || (this.productivityForm.productivityPercentage || 0) > 500) {
      console.log('Invalid productivity percentage');
      this.errorMessage = 'Productivity percentage must be between 0 and 500';
      return false;
    }
    
    console.log('Form validation passed');
    return true;
  }

  // Utility methods
  getPerformanceGrade(score: number): string {
    if (score >= 120) return 'A+';
    if (score >= 110) return 'A';
    if (score >= 100) return 'B+';
    if (score >= 90) return 'B';
    if (score >= 80) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D+';
    if (score >= 50) return 'D';
    return 'F';
  }

  getGradeColor(score: number): string {
    if (score >= 110) return 'text-green-600';
    if (score >= 100) return 'text-blue-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  getPerformanceStatus(score: number): string {
    if (score >= 100) return 'Above Target';
    if (score >= 80) return 'On Target';
    return 'Below Target';
  }

  getGradeBadgeClass(score: number): string {
    if (score >= 110) return 'bg-green-100 text-green-800';
    if (score >= 100) return 'bg-blue-100 text-blue-800';
    if (score >= 80) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }



  // Get current week number
  getCurrentWeek(): number {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  }

  // ISO week number from date
  getWeekNumber(date: string | Date): number {
    const d = new Date(date);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Get week number from productivity data (prefer stored weekNumber or extract from week field)
  getWeekFromData(data: ProductivityData): number {
    // First try to use weekNumber if available
    if (data.weekNumber) {
      return data.weekNumber;
    }
    
    // Otherwise, extract from week field (format: "Week X")
    if (data.week) {
      const weekMatch = data.week.match(/\d+/);
      if (weekMatch) {
        return parseInt(weekMatch[0]);
      }
    }
    
    // Fallback to calculating from createdAt
    if (data.createdAt) {
      return this.getWeekNumber(data.createdAt);
    }
    
    return 0;
  }


  // Get current month name
  getCurrentMonth(): string {
    return new Date().toLocaleString('default', { month: 'long' });
  }
  
  // Calendar navigation methods
  getMonths(): string[] {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }
  
  selectWeek(week: number) {
    this.selectedWeek = week;
    this.calendarView = 'week';
    this.loadProductivityForWeek();
  }
  
  goBackToYear() {
    this.calendarView = 'year';
    this.selectedWeek = null;
    this.productivityData = [];
  }
  
  // Show all productivity data (bypass calendar)
  showAllData() {
    this.calendarView = 'all';
    this.selectedWeek = null;
    this.loadAllProductivityData();
  }
  
  // Load all productivity data without filtering
  loadAllProductivityData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // When showing all data, use a very large limit to get all records
    const filterParams: any = {
      page: 1,
      limit: 10000 // Large limit to get all records
    };
    
    if (this.userRole === 'manager') {
      this.productivityService.getAllProductivityData(filterParams).subscribe({
        next: (allData) => {
          if (allData?.status === 'success' && allData.data?.productivityData) {
            this.allProductivityData = allData.data.productivityData as ProductivityData[];
            this.applyColumnFilters();
            this.totalRecords = this.allProductivityData.length;
            this.totalPages = 1; // Single page when showing all
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading all data:', error);
          this.errorMessage = 'Failed to load productivity data';
          this.isLoading = false;
        }
      });
    } else {
      this.productivityService.getMyProductivityData(
        1,
        10000 // Large limit to get all records
      ).subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data?.productivityData) {
            this.allProductivityData = response.data.productivityData as ProductivityData[];
            this.applyColumnFilters();
            this.totalRecords = this.allProductivityData.length;
            this.totalPages = 1; // Single page when showing all
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading all data:', error);
          this.errorMessage = 'Failed to load your productivity data';
          this.isLoading = false;
        }
      });
    }
  }
  
  // Go back to calendar view
  goBackToCalendar() {
    this.calendarView = 'year';
    this.selectedWeek = null;
    this.productivityData = [];
    this.allProductivityData = [];
  }
  
  // Get all week numbers for a specific year
  getWeeksInYear(year: number): number[] {
    // Get the first and last day of the year
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Get ISO week numbers for first and last day
    const firstWeek = this.getISOWeekNumber(firstDay);
    const lastWeek = this.getISOWeekNumber(lastDay);
    
    // Handle year boundary cases - weeks can span across years
    // Check if last week belongs to next year (week 1 of next year might be in current year)
    const nextYearFirstDay = new Date(year + 1, 0, 1);
    const nextYearFirstWeek = this.getISOWeekNumber(nextYearFirstDay);
    
    const weeks: number[] = [];
    
    // If next year's first week is week 1, we might need to include some weeks from previous year
    // For simplicity, we'll show weeks 1-53, but filter based on what actually exists in the year
    // Calculate total weeks - typically 52 or 53 weeks per year
    let totalWeeks = 53;
    
    // Check if year has 53 weeks by checking if Dec 31 falls in week 53
    const dec31Week = this.getISOWeekNumber(lastDay);
    if (dec31Week === 53 || (dec31Week === 52 && this.getISOWeekNumber(new Date(year, 11, 30)) === 53)) {
      totalWeeks = 53;
    } else {
      totalWeeks = 52;
    }
    
    // Generate weeks 1 through totalWeeks
    for (let week = 1; week <= totalWeeks; week++) {
      weeks.push(week);
    }
    
    return weeks;
  }
  
  // ISO week number calculation
  getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
  
  // Load weeks for selected year
  weeksInSelectedYear: number[] = [];
  
  loadWeeksForYear() {
    this.weeksInSelectedYear = this.getWeeksInYear(this.selectedYear);
  }
  
  // Load productivity data for selected week
  loadProductivityForWeek() {
    if (this.selectedWeek === null) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const filterParams: any = {
      page: 1,
      limit: 100 // Get all records for the week
    };
    
    if (this.userRole === 'manager') {
      // For managers, filter by week number
      this.productivityService.getAllProductivityData(filterParams).subscribe({
        next: (allData) => {
          if (allData?.status === 'success' && allData.data?.productivityData) {
            // Filter by week number (use stored week from database)
            const weekData = allData.data.productivityData.filter((record: ProductivityData) => {
              const recordWeek = this.getWeekFromData(record);
              return recordWeek === this.selectedWeek;
            });
            this.productivityData = weekData;
            this.allProductivityData = weekData;
            this.applyColumnFilters();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading week data:', error);
          this.errorMessage = 'Failed to load productivity data for this week';
          this.isLoading = false;
        }
      });
    } else {
      // For users, use their endpoint
      this.productivityService.getMyProductivityData(1, 100).subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data?.productivityData) {
            const weekData = response.data.productivityData.filter((record: ProductivityData) => {
              const recordWeek = this.getWeekFromData(record);
              return recordWeek === this.selectedWeek;
            });
            this.productivityData = weekData;
            this.allProductivityData = weekData;
            this.applyColumnFilters();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading week data:', error);
          this.errorMessage = 'Failed to load your productivity data for this week';
          this.isLoading = false;
        }
      });
    }
  }

  // Get pagination pages array (to prevent infinite change detection)
  getPaginationPages(): number[] {
    const maxPages = Math.min(5, this.totalPages);
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }



  // Load team members for associate name suggestions
  private loadTeamMembers(): Promise<any> {
    return new Promise((resolve) => {
      console.log('Loading team members...');
      this.isLoadingTeamMembers = true;
      
      // Get team members for the current manager
      const managerId = this.currentUser?.managerId || this.currentUser?._id;
      console.log('Manager ID:', managerId);
      console.log('Current user:', this.currentUser);
      
      if (managerId) {
        // Use manager-specific endpoint to get only their team members
        console.log('Using manager-specific endpoint');
        this.teamMemberService.getTeamMembersByManager(managerId).subscribe({
          next: (response) => {
            console.log('Team members response:', response);
            this.isLoadingTeamMembers = false;
            if (response.status === 'success' && response.data?.teamMembers) {
              this.availableTeamMembers = response.data.teamMembers;
              this.availableTeamMembersString = this.availableTeamMembers.map(m => m.name).join(', ');
              console.log('Loaded team members:', this.availableTeamMembers);
            }
            resolve(response);
          },
          error: (error) => {
            this.isLoadingTeamMembers = false;
            console.error('Error loading team members:', error);
            this.errorMessage = 'Failed to load team members. Please try again.';
            resolve(null);
          }
        });
      } else {
        // Fallback to all team members if no manager ID
        console.log('Using fallback - all team members');
        this.teamMemberService.getAllTeamMembers().subscribe({
          next: (response) => {
            console.log('All team members response:', response);
            this.isLoadingTeamMembers = false;
            if (response.status === 'success' && response.data?.teamMembers) {
              this.availableTeamMembers = response.data.teamMembers;
              this.availableTeamMembersString = this.availableTeamMembers.map(m => m.name).join(', ');
              console.log('Loaded all team members:', this.availableTeamMembers);
            }
            resolve(response);
          },
          error: (error) => {
            this.isLoadingTeamMembers = false;
            console.error('Error loading team members:', error);
            this.errorMessage = 'Failed to load team members. Please try again.';
            resolve(null);
          }
        });
      }
    });
  }

  // Column filter methods
  getUniqueAssociates(): string[] {
    const uniqueAssociates = [...new Set(this.allProductivityData.map(r => r.associateName).filter(name => name))];
    return uniqueAssociates.sort();
  }

  getFilteredAssociates(): string[] {
    if (!this.associateSearchTerm) {
      return this.getUniqueAssociates();
    }
    const searchLower = this.associateSearchTerm.toLowerCase();
    return this.getUniqueAssociates().filter(name => name && name.toLowerCase().includes(searchLower));
  }

  toggleAssociateFilter(associate: string) {
    const index = this.columnFilters.selectedAssociates.indexOf(associate);
    if (index > -1) {
      this.columnFilters.selectedAssociates.splice(index, 1);
    } else {
      this.columnFilters.selectedAssociates.push(associate);
    }
    this.applyColumnFilters();
  }

  isAssociateSelected(associate: string): boolean {
    return this.columnFilters.selectedAssociates.includes(associate);
  }

  clearAssociateFilter() {
    this.columnFilters.selectedAssociates = [];
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
    let filtered = [...this.allProductivityData];

    // Filter by Associate
    if (this.columnFilters.selectedAssociates.length > 0) {
      filtered = filtered.filter(r => this.columnFilters.selectedAssociates.includes(r.associateName));
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

    this.productivityData = filtered;
  }

  hasActiveFilters(): boolean {
    return this.columnFilters.selectedAssociates.length > 0 ||
           !!this.columnFilters.dateFrom ||
           !!this.columnFilters.dateTo;
  }

  clearAllColumnFilters() {
    this.columnFilters = {
      selectedAssociates: [],
      dateFrom: undefined,
      dateTo: undefined
    };
    this.applyColumnFilters();
  }

  // Close all filter dropdowns
  closeAllFilters() {
    this.showAssociateFilter = false;
    this.showDateFilter = false;
  }

  // Calculate dropdown position based on button position
  calculateDropdownPosition(event: MouseEvent, filterType: 'associate' | 'date') {
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
      // For associate filter, try right side first
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
    
    if (filterType === 'associate') {
      this.associateFilterPosition = position;
    } else {
      this.dateFilterPosition = position;
    }
  }

  toggleAssociateFilterMenu(event: MouseEvent) {
    this.calculateDropdownPosition(event, 'associate');
    this.showAssociateFilter = !this.showAssociateFilter;
    this.showDateFilter = false;
  }

  toggleDateFilterMenu(event: MouseEvent) {
    this.calculateDropdownPosition(event, 'date');
    this.showDateFilter = !this.showDateFilter;
    this.showAssociateFilter = false;
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
    if (this.productivityData.length === 0) {
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
    const percentages = this.productivityData.map(r => r.productivityPercentage);
    
    return {
      type: 'Average',
      productivityPercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      recordCount: this.productivityData.length
    };
  }

  calculateMin() {
    const percentages = this.productivityData.map(r => r.productivityPercentage);
    const minPercentage = Math.min(...percentages);
    const minRecord = this.productivityData.find(r => r.productivityPercentage === minPercentage);
    
    return {
      type: 'Minimum',
      productivityPercentage: minPercentage,
      record: minRecord,
      recordCount: this.productivityData.length
    };
  }

  calculateMax() {
    const percentages = this.productivityData.map(r => r.productivityPercentage);
    const maxPercentage = Math.max(...percentages);
    const maxRecord = this.productivityData.find(r => r.productivityPercentage === maxPercentage);
    
    return {
      type: 'Maximum',
      productivityPercentage: maxPercentage,
      record: maxRecord,
      recordCount: this.productivityData.length
    };
  }

  calculateSum() {
    const percentages = this.productivityData.map(r => r.productivityPercentage);
    
    return {
      type: 'Sum',
      totalProductivity: percentages.reduce((a, b) => a + b, 0),
      recordCount: this.productivityData.length
    };
  }

  calculateCount() {
    const uniqueAssociates = new Set(this.productivityData.map(r => r.associateName)).size;
    const uniqueWeeks = new Set(this.productivityData.map(r => r.week)).size;
    const uniqueMonths = new Set(this.productivityData.map(r => r.month)).size;
    
    return {
      type: 'Count',
      totalRecords: this.productivityData.length,
      uniqueAssociates: uniqueAssociates,
      uniqueWeeks: uniqueWeeks,
      uniqueMonths: uniqueMonths
    };
  }

  calculateMedian() {
    const percentages = [...this.productivityData.map(r => r.productivityPercentage)].sort((a, b) => a - b);
    const mid = Math.floor(percentages.length / 2);
    const median = percentages.length % 2 !== 0 
      ? percentages[mid] 
      : (percentages[mid - 1] + percentages[mid]) / 2;
    
    return {
      type: 'Median',
      productivityPercentage: median,
      recordCount: this.productivityData.length
    };
  }

  closeCalculationResults() {
    this.calculationResults = null;
    this.selectedCalculationType = '';
  }
}
