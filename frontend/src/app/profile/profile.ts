import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ManagerService, Manager } from '../services/manager.service';
import { TeamMemberService, TeamMember } from '../services/team-member.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  userType: 'manager' | 'team-member' | null = null;
  isLoading = false;
  isLoadingProfile = false;
  isEditing = false;
  errorMessage = '';
  successMessage = '';

  // Manager profile data
  manager: Manager | null = null;
  managerForm: {
    name: string;
    role: string;
  } = {
    name: '',
    role: 'manager'
  };

  // Team member profile data
  teamMember: TeamMember | null = null;
  teamMemberForm: {
    name: string;
  } = {
    name: ''
  };

  constructor(
    private authService: AuthService,
    private managerService: ManagerService,
    private teamMemberService: TeamMemberService,
    private router: Router
  ) {}

  ngOnInit() {
    this.determineUserType();
    this.loadProfile();
  }

  determineUserType() {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userType = payload.role === 'manager' ? 'manager' : 'team-member';
      } catch (error) {
        console.error('Error parsing token:', error);
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProfile() {
    this.isLoadingProfile = true;
    this.errorMessage = '';
    
    if (this.userType === 'manager') {
      this.managerService.getMe().subscribe({
        next: (response) => {
          if ((response.success || response.status === 'success') && response.data) {
            if (Array.isArray(response.data)) {
              this.manager = response.data[0];
            } else if (typeof response.data === 'object' && 'manager' in response.data) {
              this.manager = (response.data as any).manager;
            } else {
              this.manager = response.data as Manager;
            }
            if (this.manager) {
              this.managerForm = {
                name: this.manager.name || '',
                role: this.manager.role || 'manager'
              };
            }
          }
          this.isLoadingProfile = false;
        },
        error: (error) => {
          console.error('Error loading manager profile:', error);
          this.errorMessage = 'Failed to load profile';
          this.isLoadingProfile = false;
        }
      });
    } else if (this.userType === 'team-member') {
      this.teamMemberService.getMe().subscribe({
        next: (response) => {
          if ((response.success || response.status === 'success') && response.data) {
            if (Array.isArray(response.data)) {
              this.teamMember = response.data[0];
            } else if (typeof response.data === 'object' && 'teamMember' in response.data) {
              this.teamMember = response.data.teamMember || null;
            } else {
              this.teamMember = response.data as TeamMember;
            }
            if (this.teamMember) {
              this.teamMemberForm = {
                name: this.teamMember.name || ''
              };
            }
          }
          this.isLoadingProfile = false;
        },
        error: (error) => {
          console.error('Error loading team member profile:', error);
          this.errorMessage = 'Failed to load profile';
          this.isLoadingProfile = false;
        }
      });
    }
  }

  enableEdit() {
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit() {
    this.isEditing = false;
    // Reset form to original values
    if (this.userType === 'manager' && this.manager) {
      this.managerForm = {
        name: this.manager.name || '',
        role: this.manager.role || 'manager'
      };
    } else if (this.userType === 'team-member' && this.teamMember) {
      this.teamMemberForm = {
        name: this.teamMember.name || ''
      };
    }
    this.errorMessage = '';
    this.successMessage = '';
  }

  updateProfile() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.userType === 'manager') {
      this.managerService.updateMe(this.managerForm).subscribe({
        next: (response) => {
          if (response.success || response.status === 'success') {
            this.successMessage = 'Profile updated successfully';
            this.isEditing = false;
            this.loadProfile(); // Reload to get updated data
          } else {
            this.errorMessage = response.message || 'Failed to update profile';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating manager profile:', error);
          this.errorMessage = error.error?.message || 'Failed to update profile';
          this.isLoading = false;
        }
      });
    } else if (this.userType === 'team-member') {
      this.teamMemberService.updateMe(this.teamMemberForm).subscribe({
        next: (response) => {
          if (response.success || response.status === 'success') {
            this.successMessage = 'Profile updated successfully';
            this.isEditing = false;
            this.loadProfile(); // Reload to get updated data
          } else {
            this.errorMessage = response.message || 'Failed to update profile';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating team member profile:', error);
          this.errorMessage = error.error?.message || 'Failed to update profile';
          this.isLoading = false;
        }
      });
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getManagerName(managerId: any): string {
    if (!managerId) return 'N/A';
    if (typeof managerId === 'object' && managerId.name) {
      return managerId.name;
    }
    return 'N/A';
  }

  getManagerEmail(managerId: any): string {
    if (!managerId) return '';
    if (typeof managerId === 'object' && managerId.email) {
      return managerId.email;
    }
    return '';
  }
}

