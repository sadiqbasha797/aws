import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductivityService, ProductivityData } from '../services/productivity.service';
import { TeamMemberService } from '../services/team-member.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-productivity-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productivity-create.html',
  styleUrls: ['./productivity-create.css']
})
export class ProductivityCreateComponent implements OnInit {
  productivityForm: Partial<ProductivityData> = {
    teamManager: '',
    associateName: '',
    month: this.getCurrentMonth(),
    week: `Week ${this.getCurrentWeek()}`,
    productivityPercentage: 0,
    year: new Date().getFullYear(),
    notes: ''
  };

  currentUser: any = null;

  availableTeamMembers: any[] = [];
  isLoadingTeamMembers = false;
  loading = false;
  error = '';

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

  constructor(
    private productivityService: ProductivityService,
    private teamMemberService: TeamMemberService,
    private router: Router,
    private authService: AuthService
  ) {
    this.checkManagerAccess();
    this.generateYearOptions();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadTeamMembers();
  }

  private loadCurrentUser(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUser = payload;
        // Set teamManager from user info
        this.productivityForm.teamManager = payload.managerId || payload._id || payload.name?.toLowerCase() || '';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }

  private checkManagerAccess(): void {
    const token = this.authService.getToken();
    let userRole = 'user';
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    if (userRole !== 'manager') {
      this.router.navigate(['/productivity']);
    }
  }

  private generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      this.yearOptions.push(year);
    }
  }

  private getCurrentMonth(): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
  }

  private getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  loadTeamMembers(): void {
    this.isLoadingTeamMembers = true;
    this.teamMemberService.getAllTeamMembers().subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.teamMembers) {
          this.availableTeamMembers = response.data.teamMembers.filter((m: any) => m.isActive);
        }
        this.isLoadingTeamMembers = false;
      },
      error: (error) => {
        console.error('Error loading team members:', error);
        this.isLoadingTeamMembers = false;
        this.error = 'Failed to load team members. Please try again.';
      }
    });
  }

  createProductivity(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.productivityService.createProductivityData(this.productivityForm as Omit<ProductivityData, '_id' | 'createdAt' | 'updatedAt'>).subscribe({
      next: (response) => {
        this.router.navigate(['/productivity']);
      },
      error: (error) => {
        console.error('Error creating productivity data:', error);
        this.error = error.error?.message || 'Failed to create productivity data. Please try again.';
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.productivityForm.associateName || !this.productivityForm.month || !this.productivityForm.week) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.name === this.productivityForm.associateName)) {
      this.error = 'Please select a valid associate from the dropdown';
      return false;
    }

    if ((this.productivityForm.productivityPercentage || 0) < 0 || (this.productivityForm.productivityPercentage || 0) > 500) {
      this.error = 'Productivity percentage must be between 0 and 500';
      return false;
    }

    return true;
  }

  cancel(): void {
    this.router.navigate(['/productivity']);
  }
}

