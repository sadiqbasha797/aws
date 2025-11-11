import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface DashboardStats {
  sops: {
    total: number;
    active: number;
    recent: Array<{
      _id: string;
      title: string;
      createdAt: string;
      createdBy?: {
        name: string;
        email: string;
      };
    }>;
  };
  teamMembers: {
    total: number;
    active: number;
    inactive: number;
  };
  managers: {
    total: number;
  };
  productivity: {
    totalRecords: number;
    avgProductivity: number;
    maxProductivity: number;
    minProductivity: number;
  };
  reliability: {
    totalRecords: number;
    avgReliabilityScore: number;
    maxReliabilityScore: number;
    minReliabilityScore: number;
  };
  bin: {
    itemsInBin: number;
  };
  recentActivities: Array<{
    type: string;
    title: string;
    createdAt: string;
    createdBy: string;
  }>;
  managerStats?: {
    mySOPs: number;
    productivityRecords: number;
    avgProductivity: number;
    reliabilityWorkers: number;
    avgReliability: number;
  } | null;
}

export interface RecentActivity {
  type: string;
  icon: string;
  color: string;
  title: string;
  description: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getDashboardStats(): Observable<{ message: string; stats: DashboardStats }> {
    return this.http.get<{ message: string; stats: DashboardStats }>(
      `${this.baseUrl}/dashboard/stats`,
      { headers: this.getHeaders() }
    );
  }

  getRecentActivities(limit: number = 10): Observable<{ message: string; activities: RecentActivity[] }> {
    return this.http.get<{ message: string; activities: RecentActivity[] }>(
      `${this.baseUrl}/dashboard/activities?limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  getReliabilityMonthlyData(): Observable<{ message: string; data: MonthlyReliabilityData[] }> {
    return this.http.get<{ message: string; data: MonthlyReliabilityData[] }>(
      `${this.baseUrl}/dashboard/reliability/monthly`,
      { headers: this.getHeaders() }
    );
  }

  getProductivityWeeklyData(): Observable<{ message: string; data: WeeklyProductivityData[] }> {
    return this.http.get<{ message: string; data: WeeklyProductivityData[] }>(
      `${this.baseUrl}/dashboard/productivity/weekly`,
      { headers: this.getHeaders() }
    );
  }
}

export interface MonthlyReliabilityData {
  month: string;
  monthNumber: number;
  year: number;
  avgReliabilityScore: number;
  recordCount: number;
}

export interface WeeklyProductivityData {
  week: string;
  weekNumber: number;
  year: number;
  avgProductivity: number;
  recordCount: number;
}

