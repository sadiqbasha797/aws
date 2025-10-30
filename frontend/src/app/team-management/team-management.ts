import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService, TeamMember, TeamBatch } from '../services/team.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-management.html',
  styleUrls: ['./team-management.css']
})
export class TeamManagementComponent implements OnInit {
  activeTab: 'members' | 'batches' = 'members';
  
  // Team Members
  teamMembers: TeamMember[] = [];
  loadingMembers = true;
  
  // Batches
  batches: TeamBatch[] = [];
  loadingBatches = true;
  
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
    this.loadBatches();
  }

  checkManagerAccess(): void {
    this.userRole = this.teamService.getUserRole();
    if (this.userRole !== 'manager') {
      alert('Access denied. Manager role required.');
      this.router.navigate(['/dashboard']);
    }
  }

  switchTab(tab: 'members' | 'batches'): void {
    this.activeTab = tab;
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

  // Batch Operations
  loadBatches(): void {
    this.loadingBatches = true;
    this.teamService.getAllBatches().subscribe({
      next: (response) => {
        this.batches = response.batches;
        this.loadingBatches = false;
      },
      error: (error) => {
        console.error('Error loading batches:', error);
        this.error = 'Failed to load batches';
        this.loadingBatches = false;
      }
    });
  }

  createBatch(): void {
    this.router.navigate(['/batches/create']);
  }

  editBatch(batch: TeamBatch): void {
    this.router.navigate(['/batches', batch._id, 'edit']);
  }

  deleteBatch(batch: TeamBatch): void {
    if (!confirm(`Are you sure you want to delete ${batch.batchName}?`)) {
      return;
    }

    this.teamService.deleteBatch(batch._id).subscribe({
      next: () => {
        this.loadBatches();
      },
      error: (error) => {
        console.error('Error deleting batch:', error);
        alert('Failed to delete batch');
      }
    });
  }

  getMemberNames(memberIds: string[]): string {
    if (!memberIds || memberIds.length === 0) {
      return 'No members assigned';
    }
    return memberIds
      .map(id => {
        const member = this.teamMembers.find(m => m._id === id);
        return member ? member.name : 'Unknown';
      })
      .join(', ');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
