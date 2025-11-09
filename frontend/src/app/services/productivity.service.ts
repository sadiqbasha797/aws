import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from './environment';

export interface ProductivityData {
  _id?: string;
  teamManager: string;
  associateName: string;
  month: string;
  week: string;
  productivityPercentage: number;
  year: number;
  weekNumber?: number;
  performanceCategory?: string;
  performanceGrade?: string;
  performanceStatus?: string;
  isActive?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Aggregated view properties
  recordCount?: number;
  totalRecords?: number;
  avgProductivity?: number;
  bestPerformance?: number;
  worstPerformance?: number;
  trend?: number;
  aboveTarget?: number;
  onTarget?: number;
  belowTarget?: number;
  latestRecord?: Date;
}

export interface ProductivityStats {
  totalAssociates: number;
  avgProductivity: number;
  maxProductivity: number;
  minProductivity: number;
  aboveTarget: number;
  onTarget: number;
  belowTarget: number;
}

export interface ProductivityResponse {
  status: string;
  message?: string;
  results?: number;
  total?: number;
  page?: number;
  pages?: number;
  data?: {
    productivityData?: ProductivityData[];
    stats?: ProductivityStats;
    topPerformers?: ProductivityData[];
    trendAnalysis?: any[];
    teamMember?: any;
    productivityHistory?: ProductivityData[];
    period?: { year: number; month?: string; weekNumber?: number };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductivityService {
  private baseUrl = `${environment.baseUrl}/productivity`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Team member routes (read-only access to their own data)
  getMyProductivityData(page: number = 1, limit: number = 10, year?: number, month?: string, week?: string): Observable<ProductivityResponse> {
    let params = `?page=${page}&limit=${limit}`;
    if (year) params += `&year=${year}`;
    if (month) params += `&month=${month}`;
    if (week) params += `&week=${week}`;
    
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/my-data${params}`, {
      headers: this.getHeaders()
    });
  }

  // Manager routes (full CRUD access)
  getAllProductivityData(params?: {
    page?: number;
    limit?: number;
    teamManager?: string;
    associateName?: string;
    month?: string;
    week?: string;
    year?: number;
    minProductivity?: number;
    maxProductivity?: number;
    performanceCategory?: string;
    search?: string;
  }): Observable<ProductivityResponse> {
    let queryParams = '?';
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams += `${key}=${encodeURIComponent(value)}&`;
        }
      });
    }
    
    // Remove trailing '&' or '?' if no params
    queryParams = queryParams.endsWith('&') ? queryParams.slice(0, -1) : queryParams;
    queryParams = queryParams === '?' ? '' : queryParams;
    
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  // Get aggregated team member performance
  getAggregatedTeamPerformance(params?: {
    page?: number;
    limit?: number;
    year?: number;
    month?: string;
    search?: string;
  }): Observable<ProductivityResponse> {
    let queryParams = '?';
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams += `${key}=${encodeURIComponent(value)}&`;
        }
      });
    }
    
    // Remove trailing '&' or '?' if no params
    queryParams = queryParams.endsWith('&') ? queryParams.slice(0, -1) : queryParams;
    queryParams = queryParams === '?' ? '' : queryParams;
    
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/aggregated${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  getProductivityData(id: string): Observable<ProductivityResponse> {
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createProductivityData(data: Omit<ProductivityData, '_id' | 'createdAt' | 'updatedAt'>): Observable<ProductivityResponse> {
    return this.http.post<ProductivityResponse>(`${this.baseUrl}/`, data, {
      headers: this.getHeaders()
    });
  }

  updateProductivityData(id: string, data: Partial<ProductivityData>): Observable<ProductivityResponse> {
    return this.http.patch<ProductivityResponse>(`${this.baseUrl}/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  deleteProductivityData(id: string): Observable<ProductivityResponse> {
    return this.http.delete<ProductivityResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Analytics and reporting
  getProductivityStats(year?: number, month?: string): Observable<ProductivityResponse> {
    let params = '';
    if (year || month) {
      params = '?';
      if (year) params += `year=${year}&`;
      if (month) params += `month=${month}&`;
      params = params.endsWith('&') ? params.slice(0, -1) : params;
    }
    
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/stats${params}`, {
      headers: this.getHeaders()
    });
  }

  getTopPerformers(limit: number = 10, year?: number, month?: string): Observable<ProductivityResponse> {
    let params = `?limit=${limit}`;
    if (year) params += `&year=${year}`;
    if (month) params += `&month=${month}`;
    
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/top-performers${params}`, {
      headers: this.getHeaders()
    });
  }

  getPerformanceTrends(year?: number): Observable<ProductivityResponse> {
    const params = year ? `?year=${year}` : '';
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/trends${params}`, {
      headers: this.getHeaders()
    });
  }

  getProductivityByWeek(year: number, weekNumber: number): Observable<ProductivityResponse> {
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/week/${year}/${weekNumber}`, {
      headers: this.getHeaders()
    });
  }

  getProductivityByMonth(year: number, month: string): Observable<ProductivityResponse> {
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/month/${year}/${month}`, {
      headers: this.getHeaders()
    });
  }

  getTeamMemberProductivityHistory(associateName: string, page: number = 1, limit: number = 12): Observable<ProductivityResponse> {
    return this.http.get<ProductivityResponse>(`${this.baseUrl}/team-member/${associateName}/history?page=${page}&limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  bulkCreateProductivityData(data: any[]): Observable<ProductivityResponse> {
    return this.http.post<ProductivityResponse>(`${this.baseUrl}/bulk`, { data }, {
      headers: this.getHeaders()
    });
  }
}
