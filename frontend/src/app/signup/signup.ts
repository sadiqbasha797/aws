import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterManagerRequest, RegisterTeamMemberRequest } from '../services/auth.service';
import { ManagerService, Manager } from '../services/manager.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup implements OnInit {
  userType: 'manager' | 'team-member' = 'team-member';
  
  // Manager form data
  managerForm: RegisterManagerRequest = {
    name: '',
    email: '',
    password: '',
    role: 'manager'
  };
  managerConfirmPassword = '';

  // Team member form data
  teamMemberForm: RegisterTeamMemberRequest = {
    name: '',
    email: '',
    password: '',
    managerId: '',
    workerId: '',
    da_id: ''
  };
  teamMemberConfirmPassword = '';

  // Managers list for team member signup
  managers: Manager[] = [];
  
  isLoading = false;
  isLoadingManagers = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private managerService: ManagerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadManagers();
  }

  loadManagers() {
    this.isLoadingManagers = true;
    this.managerService.getActiveManagersForSignup().subscribe({
      next: (response) => {
        if ((response.status === 'success' || response.success) && response.data) {
          if (Array.isArray(response.data)) {
            this.managers = response.data;
          } else if (typeof response.data === 'object' && 'managers' in response.data) {
            this.managers = (response.data as any).managers || [];
          } else {
            this.managers = [];
          }
        }
        this.isLoadingManagers = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.isLoadingManagers = false;
        // Don't show error, just log it - managers might not be required if entered manually
      }
    });
  }

  setUserType(type: 'manager' | 'team-member') {
    this.userType = type;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmitManager() {
    if (this.isLoading) return;
    
    // Validate passwords match
    if (this.managerForm.password !== this.managerConfirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Validate password length
    if (this.managerForm.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const registerData: RegisterManagerRequest = {
      name: this.managerForm.name,
      email: this.managerForm.email,
      password: this.managerForm.password,
      role: this.managerForm.role || 'manager'
    };

    this.authService.registerManager(registerData).subscribe({
      next: (response) => {
        if (response.success && response.token) {
          this.authService.setToken(response.token);
          this.successMessage = response.message || 'Manager registered successfully! Redirecting...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Registration failed';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.errorMessage = error.error?.message || 'An error occurred during registration';
        this.isLoading = false;
      }
    });
  }

  onSubmitTeamMember() {
    if (this.isLoading) return;
    
    // Validate passwords match
    if (this.teamMemberForm.password !== this.teamMemberConfirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    // Validate password length
    if (this.teamMemberForm.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    // Validate manager is selected
    if (!this.teamMemberForm.managerId) {
      this.errorMessage = 'Please select a manager';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const registerData: RegisterTeamMemberRequest = {
      name: this.teamMemberForm.name,
      email: this.teamMemberForm.email,
      password: this.teamMemberForm.password,
      managerId: this.teamMemberForm.managerId,
      workerId: this.teamMemberForm.workerId || undefined,
      da_id: this.teamMemberForm.da_id || undefined
    };

    this.authService.registerUser(registerData).subscribe({
      next: (response) => {
        if (response.success && response.token) {
          this.authService.setToken(response.token);
          this.successMessage = response.message || 'Team member registered successfully! Redirecting...';
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          this.errorMessage = response.message || 'Registration failed';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Registration error:', error);
        this.errorMessage = error.error?.message || 'An error occurred during registration';
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.userType === 'manager') {
      this.onSubmitManager();
    } else {
      this.onSubmitTeamMember();
    }
  }
}

