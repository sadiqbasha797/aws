import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeamService, TeamMember } from '../services/team.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-team-member-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-member-form.html',
  styleUrls: ['./team-member-form.css']
})
export class TeamMemberFormComponent implements OnInit {
  memberForm = {
    name: '',
    email: '',
    password: '',
    workerId: '',
    isActive: true
  };

  isEditMode = false;
  memberId: string | null = null;
  loading = false;
  error = '';

  constructor(
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.checkManagerAccess();
  }

  ngOnInit(): void {
    // Use paramMap observable to handle route changes
    this.route.paramMap.subscribe(params => {
      this.memberId = params.get('id');
      if (this.memberId) {
        this.isEditMode = true;
        this.loadMember();
      } else {
        this.isEditMode = false;
      }
    });
  }

  private checkManagerAccess(): void {
    const userRole = this.teamService.getUserRole();
    if (userRole !== 'manager') {
      alert('Access denied. Manager role required.');
      this.router.navigate(['/dashboard']);
    }
  }

  loadMember(): void {
    if (!this.memberId) return;

    this.loading = true;
    this.error = '';
    this.teamService.getTeamMemberById(this.memberId).subscribe({
      next: (response: any) => {
        // Handle different response structures
        const member = response.data?.teamMember || response.teamMember;
        
        if (!member) {
          this.error = 'Team member not found';
          this.loading = false;
          return;
        }
        
        this.memberForm = {
          name: member.name || '',
          email: member.email || '',
          password: '', // Password not needed in edit mode
          workerId: member.workerId || '',
          isActive: member.isActive !== undefined ? member.isActive : true
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading member:', error);
        this.error = error.error?.message || error.error?.error?.message || 'Failed to load team member';
        this.loading = false;
      }
    });
  }

  saveMember(): void {
    if (!this.memberForm.name || !this.memberForm.email) {
      this.error = 'Name and email are required';
      return;
    }

    // Password is required only when creating a new member
    if (!this.isEditMode && !this.memberForm.password) {
      this.error = 'Password is required';
      return;
    }

    if (!this.isEditMode && this.memberForm.password && this.memberForm.password.length < 6) {
      this.error = 'Password must be at least 6 characters long';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.isEditMode && this.memberId) {
      // Don't send password when updating (unless they want to change it, but we're not implementing that now)
      const updateData = {
        name: this.memberForm.name,
        email: this.memberForm.email,
        workerId: this.memberForm.workerId || undefined,
        isActive: this.memberForm.isActive
      };
      this.teamService.updateTeamMember(this.memberId, updateData).subscribe({
        next: (response) => {
          this.loading = false;
          this.router.navigate(['/team-management']);
        },
        error: (error) => {
          console.error('Error updating member:', error);
          this.error = error.error?.message || 'Failed to update team member';
          this.loading = false;
        }
      });
    } else {
      // Include password when creating
      this.teamService.createTeamMember(this.memberForm).subscribe({
        next: (response) => {
          this.loading = false;
          this.router.navigate(['/team-management']);
        },
        error: (error) => {
          console.error('Error creating member:', error);
          this.error = error.error?.message || 'Failed to create team member';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/team-management']);
  }
}

