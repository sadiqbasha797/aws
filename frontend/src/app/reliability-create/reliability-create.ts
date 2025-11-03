import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReliabilityService, ReliabilityData } from '../services/reliability.service';
import { TeamMemberService } from '../services/team-member.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reliability-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reliability-create.html',
  styleUrls: ['./reliability-create.css']
})
export class ReliabilityCreateComponent implements OnInit {
  reliabilityForm: Partial<ReliabilityData> = {
    workerId: '',
    daId: '',
    managerId: '',
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

  currentUser: any = null;

  availableTeamMembers: any[] = [];
  isLoadingTeamMembers = false;
  loading = false;
  error = '';

  monthOptions = [
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

  yearOptions: number[] = [];

  constructor(
    private reliabilityService: ReliabilityService,
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
        // Set managerId from user info
        this.reliabilityForm.managerId = payload.managerId || payload._id || payload.name?.toLowerCase() || '';
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
      this.router.navigate(['/reliability']);
    }
  }

  private generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      this.yearOptions.push(year);
    }
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

  onDaIdChange(): void {
    const selectedMember = this.availableTeamMembers.find(m => m.da_id === this.reliabilityForm.daId);
    if (selectedMember) {
      this.reliabilityForm.workerId = selectedMember.workerId || '';
    }
  }

  calculateScore(): void {
    if (this.reliabilityForm.totalOpportunities && this.reliabilityForm.totalOpportunities > 0) {
      const segmentAccuracy = this.reliabilityForm.totalSegmentsMatching 
        ? (this.reliabilityForm.totalSegmentsMatching / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      const labelAccuracy = this.reliabilityForm.totalLabelMatching 
        ? (this.reliabilityForm.totalLabelMatching / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      const defectRate = this.reliabilityForm.totalDefects 
        ? (this.reliabilityForm.totalDefects / this.reliabilityForm.totalOpportunities) * 100 
        : 0;
      
      // Calculate overall reliability score
      const baseScore = (segmentAccuracy + labelAccuracy) / 2;
      this.reliabilityForm.overallReliabilityScore = Math.max(0, Math.min(100, baseScore - defectRate));
    }
  }

  createReliability(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.reliabilityService.createReliabilityData(this.reliabilityForm as Omit<ReliabilityData, '_id' | 'createdAt' | 'updatedAt'>).subscribe({
      next: (response) => {
        this.router.navigate(['/reliability']);
      },
      error: (error) => {
        console.error('Error creating reliability data:', error);
        this.error = error.error?.message || 'Failed to create reliability data. Please try again.';
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.reliabilityForm.workerId || !this.reliabilityForm.daId || !this.reliabilityForm.processname || !this.reliabilityForm.job_id) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    if (this.availableTeamMembers.length > 0 && !this.availableTeamMembers.find(m => m.da_id === this.reliabilityForm.daId)) {
      this.error = 'Please select a valid DA ID from the dropdown';
      return false;
    }

    if (this.reliabilityForm.totalOpportunities === 0) {
      this.error = 'Total opportunities must be greater than 0';
      return false;
    }

    if ((this.reliabilityForm.overallReliabilityScore || 0) < 0 || (this.reliabilityForm.overallReliabilityScore || 0) > 100) {
      this.error = 'Overall reliability score must be between 0 and 100';
      return false;
    }

    return true;
  }

  cancel(): void {
    this.router.navigate(['/reliability']);
  }
}

