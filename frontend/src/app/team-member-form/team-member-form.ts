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
    department: '',
    position: '',
    phone: '',
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
    this.memberId = this.route.snapshot.paramMap.get('id');
    if (this.memberId) {
      this.isEditMode = true;
      this.loadMember();
    }
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
    this.teamService.getTeamMemberById(this.memberId).subscribe({
      next: (response) => {
        const member = response.teamMember;
        this.memberForm = {
          name: member.name,
          email: member.email,
          department: member.department || '',
          position: member.position || '',
          phone: member.phone || '',
          isActive: member.isActive
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading member:', error);
        this.error = 'Failed to load team member';
        this.loading = false;
      }
    });
  }

  saveMember(): void {
    if (!this.memberForm.name || !this.memberForm.email) {
      this.error = 'Name and email are required';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.isEditMode && this.memberId) {
      this.teamService.updateTeamMember(this.memberId, this.memberForm).subscribe({
        next: () => {
          this.router.navigate(['/team-management']);
        },
        error: (error) => {
          console.error('Error updating member:', error);
          this.error = error.error?.message || 'Failed to update team member';
          this.loading = false;
        }
      });
    } else {
      this.teamService.createTeamMember(this.memberForm).subscribe({
        next: () => {
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

