import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats, RecentActivity } from '../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  stats: DashboardStats | null = null;
  activities: RecentActivity[] = [];
  loading = true;
  error = '';

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';

    this.dashboardService.getDashboardStats().subscribe({
      next: (response) => {
        this.stats = response.stats;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.error = 'Failed to load dashboard data';
        this.loading = false;
      }
    });

    this.dashboardService.getRecentActivities(10).subscribe({
      next: (response) => {
        this.activities = response.activities;
      },
      error: (error) => {
        console.error('Error loading activities:', error);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }


  navigateToSOPs(): void {
    this.router.navigate(['/sops']);
  }

  navigateToCreateSOP(): void {
    this.router.navigate(['/sops/create']);
  }

  navigateToTeamManagement(): void {
    this.router.navigate(['/team-management']);
  }

  navigateToProductivity(): void {
    this.router.navigate(['/productivity']);
  }

  navigateToReliability(): void {
    this.router.navigate(['/reliability']);
  }
}
