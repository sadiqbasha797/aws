import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService, TeamMember } from '../services/team.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-management.html',
  styleUrls: ['./team-management.css']
})
export class TeamManagementComponent implements OnInit {
  // Team Members
  teamMembers: TeamMember[] = [];
  loadingMembers = true;
  
  error = '';
  userRole = '';

  constructor(
    private teamService: TeamService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkManagerAccess();
    this.loadTeamMembers();
  }

  checkManagerAccess(): void {
    this.userRole = this.teamService.getUserRole();
    if (this.userRole !== 'manager') {
      alert('Access denied. Manager role required.');
      this.router.navigate(['/dashboard']);
    }
  }


  // Team Member Operations
  loadTeamMembers(): void {
    this.loadingMembers = true;
    this.teamService.getAllTeamMembers().subscribe({
      next: (response) => {
        this.teamMembers = response.teamMembers;
        this.loadingMembers = false;
      },
      error: (error) => {
        console.error('Error loading team members:', error);
        this.error = 'Failed to load team members';
        this.loadingMembers = false;
      }
    });
  }

  createMember(): void {
    this.router.navigate(['/team-members/create']);
  }

  editMember(member: TeamMember): void {
    this.router.navigate(['/team-members', member._id, 'edit']);
  }

  deleteMember(member: TeamMember): void {
    if (!confirm(`Are you sure you want to delete ${member.name}?`)) {
      return;
    }

    this.teamService.deleteTeamMember(member._id).subscribe({
      next: () => {
        this.loadTeamMembers();
      },
      error: (error) => {
        console.error('Error deleting member:', error);
        alert('Failed to delete member');
      }
    });
  }


  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
