import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService, DashboardStats, RecentActivity, MonthlyReliabilityData, WeeklyProductivityData } from '../services/dashboard.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {
  stats: DashboardStats | null = null;
  activities: RecentActivity[] = [];
  loading = true;
  error = '';
  reliabilityData: MonthlyReliabilityData[] = [];
  productivityData: WeeklyProductivityData[] = [];
  chartsReady = false;
  
  @ViewChild('reliabilityChart') reliabilityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productivityChart') productivityChartRef!: ElementRef<HTMLCanvasElement>;
  
  reliabilityChart: Chart | null = null;
  productivityChart: Chart | null = null;

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.cdr.detectChanges();
    // Try to initialize charts if data is already loaded
    setTimeout(() => {
      this.tryInitializeCharts();
    }, 300);
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = '';

    this.dashboardService.getDashboardStats().subscribe({
      next: (response) => {
        this.stats = response.stats;
        this.loading = false;
        // After stats are loaded, the chart containers will be in DOM
        // Wait a bit for Angular to render, then try to initialize charts
        setTimeout(() => {
          this.tryInitializeCharts();
        }, 100);
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

    // Also refresh chart data
    this.loadChartData();
  }

  loadChartData(): void {
    // Load reliability monthly data
    this.dashboardService.getReliabilityMonthlyData().subscribe({
      next: (response) => {
        console.log('Reliability data loaded:', response);
        this.reliabilityData = response.data || [];
        console.log('Reliability data array:', this.reliabilityData);
        // Trigger change detection and try to initialize chart after a delay
        this.cdr.detectChanges();
        setTimeout(() => {
          this.tryInitializeReliabilityChart();
        }, 300);
      },
      error: (error) => {
        console.error('Error loading reliability data:', error);
        this.reliabilityData = [];
      }
    });

    // Load productivity weekly data
    this.dashboardService.getProductivityWeeklyData().subscribe({
      next: (response) => {
        console.log('Productivity data loaded:', response);
        this.productivityData = response.data || [];
        console.log('Productivity data array:', this.productivityData);
        // Trigger change detection and try to initialize chart after a delay
        this.cdr.detectChanges();
        setTimeout(() => {
          this.tryInitializeProductivityChart();
        }, 300);
      },
      error: (error) => {
        console.error('Error loading productivity data:', error);
        this.productivityData = [];
      }
    });
  }

  tryInitializeCharts(): void {
    if (this.chartsReady) {
      this.tryInitializeReliabilityChart();
      this.tryInitializeProductivityChart();
    }
  }

  tryInitializeReliabilityChart(): void {
    // Check if stats are loaded (which means the chart container is in DOM)
    if (this.loading || !this.stats) {
      console.log('Waiting for stats to load before initializing reliability chart');
      // Retry after stats are loaded
      setTimeout(() => this.tryInitializeReliabilityChart(), 500);
      return;
    }

    if (!this.reliabilityChartRef?.nativeElement) {
      console.log('Reliability chart canvas not found, retrying...', {
        hasRef: !!this.reliabilityChartRef,
        hasNativeElement: !!this.reliabilityChartRef?.nativeElement,
        dataLength: this.reliabilityData.length
      });
      // Retry after a short delay
      setTimeout(() => this.tryInitializeReliabilityChart(), 300);
      return;
    }

    if (this.reliabilityData.length === 0) {
      console.log('No reliability data to display');
      return;
    }

    console.log('Initializing reliability chart with', this.reliabilityData.length, 'data points');
    this.initializeReliabilityChart();
  }

  tryInitializeProductivityChart(): void {
    // Check if stats are loaded (which means the chart container is in DOM)
    if (this.loading || !this.stats) {
      console.log('Waiting for stats to load before initializing productivity chart');
      // Retry after stats are loaded
      setTimeout(() => this.tryInitializeProductivityChart(), 500);
      return;
    }

    if (!this.productivityChartRef?.nativeElement) {
      console.log('Productivity chart canvas not found, retrying...', {
        hasRef: !!this.productivityChartRef,
        hasNativeElement: !!this.productivityChartRef?.nativeElement,
        dataLength: this.productivityData.length
      });
      // Retry after a short delay
      setTimeout(() => this.tryInitializeProductivityChart(), 300);
      return;
    }

    if (this.productivityData.length === 0) {
      console.log('No productivity data to display');
      return;
    }

    console.log('Initializing productivity chart with', this.productivityData.length, 'data points');
    this.initializeProductivityChart();
  }

  initializeReliabilityChart(): void {
    if (!this.reliabilityChartRef?.nativeElement) {
      console.error('Reliability chart canvas element not found');
      return;
    }

    if (!this.reliabilityData.length) {
      console.log('No reliability data to display in chart');
      return;
    }

    // Destroy existing chart if it exists
    if (this.reliabilityChart) {
      this.reliabilityChart.destroy();
      this.reliabilityChart = null;
    }

    const ctx = this.reliabilityChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2d context for reliability chart');
      return;
    }

    const labels = this.reliabilityData.map(d => d.month);
    const data = this.reliabilityData.map(d => d.avgReliabilityScore || 0);
    
    console.log('Initializing reliability chart with data:', { labels, data });

    this.reliabilityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Reliability Score (%)',
          data: data,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(147, 51, 234)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Reliability (Last 5 Months)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                if (value === null || value === undefined) {
                  return 'Reliability: N/A';
                }
                return `Reliability: ${value.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            title: {
              display: true,
              text: 'Reliability Score (%)'
            },
            grid: {
              display: false
            }
          },
          x: {
            title: {
              display: true,
              text: 'Month'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  initializeProductivityChart(): void {
    if (!this.productivityChartRef?.nativeElement) {
      console.error('Productivity chart canvas element not found');
      return;
    }

    if (!this.productivityData.length) {
      console.log('No productivity data to display in chart');
      return;
    }

    // Destroy existing chart if it exists
    if (this.productivityChart) {
      this.productivityChart.destroy();
      this.productivityChart = null;
    }

    const ctx = this.productivityChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2d context for productivity chart');
      return;
    }

    const labels = this.productivityData.map(d => d.week);
    const data = this.productivityData.map(d => d.avgProductivity || 0);
    
    console.log('Initializing productivity chart with data:', { labels, data });

    this.productivityChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Productivity (%)',
          data: data,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Weekly Productivity (Last 5 Weeks)',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                if (value === null || value === undefined) {
                  return 'Productivity: N/A';
                }
                return `Productivity: ${value.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            title: {
              display: true,
              text: 'Productivity (%)'
            },
            grid: {
              display: false
            }
          },
          x: {
            title: {
              display: true,
              text: 'Week'
            },
            grid: {
              display: false
            }
          }
        }
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

  refreshCharts(): void {
    this.loadChartData();
  }
}
