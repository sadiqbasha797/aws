import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  
  weekOptions = Array.from({ length: 53 }, (_, i) => ({ 
    value: `Week ${i + 1}`, 
    label: `Week ${i + 1}` 
  }));
  
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
  showAggregatedView = true;
  selectedTeamMember: any = null;
  teamMemberDetails: ProductivityData[] = [];
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
    month: undefined as string | undefined,
    week: undefined as string | undefined,
    search: '',
    minProductivity: undefined as number | undefined,
    maxProductivity: undefined as number | undefined,
    performanceCategory: undefined as string | undefined
  };
  
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
    private teamMemberService: TeamMemberService
  ) {}

  ngOnInit() {
    this.initializeYearOptions();
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
    
    // Prepare filters, excluding undefined values
    const filterParams: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    
    // Only add defined filter values
    if (this.filters.year) filterParams.year = this.filters.year;
    if (this.filters.month) filterParams.month = this.filters.month;
    if (this.filters.week) filterParams.week = this.filters.week;
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
          this.productivityData = allData.data.productivityData;
          this.totalRecords = allData.total || 0;
          this.totalPages = allData.pages || 1;
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
    
    this.productivityService.getMyProductivityData(
      this.currentPage,
      this.pageSize,
      this.filters.year,
      this.filters.month,
      this.filters.week
    ).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.productivityData) {
          this.productivityData = response.data.productivityData;
          this.totalRecords = response.total || 0;
          this.totalPages = response.pages || 1;
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
      month: undefined,
      week: undefined,
      search: '',
      minProductivity: undefined,
      maxProductivity: undefined,
      performanceCategory: undefined
    };
    this.applyFilters();
  }

  // CRUD operations (Manager only)
  showCreateForm() {
    if (this.showForm) {
      return; // Prevent multiple calls
    }
    
    this.isEditMode = false;
    this.editingId = '';
    this.productivityForm = {
      associateName: '',
      month: this.getCurrentMonth(),
      week: `Week ${this.getCurrentWeek()}`,
      productivityPercentage: 0,
      year: new Date().getFullYear(),
      notes: ''
    };
    this.showForm = true;
    
    // Load team members if not already loaded
    if (this.availableTeamMembers.length === 0 && !this.isLoadingTeamMembers) {
      this.loadTeamMembers();
    }
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

  // Get current month name
  getCurrentMonth(): string {
    return new Date().toLocaleString('default', { month: 'long' });
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
}
