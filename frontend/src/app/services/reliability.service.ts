import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from './environment';

export interface ReliabilityData {
  _id?: string;
  workerId?: string;
  daId: string;
  managerId?: string;
  processname?: string;
  job_id?: string;
  totalTasks: number;
  totalOpportunities: number;
  totalSegmentsMatching?: number;
  totalLabelMatching?: number;
  totalDefects: number;
  overallReliabilityScore: number;
  segmentAccuracy?: number;
  labelAccuracy?: number;
  defectRate?: number;
  period?: string;
  month?: number;
  year?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // Aggregated view properties
  recordCount?: number;
  processes?: string[];
  latestRecord?: Date;
}

export interface PerformanceStats {
  totalWorkers: number;
  avgReliabilityScore: number;
  maxReliabilityScore: number;
  minReliabilityScore: number;
  totalTasks: number;
  totalOpportunities: number;
  totalDefects: number;
  avgSegmentAccuracy: number;
  avgLabelAccuracy: number;
  avgDefectRate: number;
}

export interface BulkUploadResults {
  total: number;
  success: number;
  failed: number;
  successRecords?: any[];
  failedRecords?: Array<{ index: number; record: any; error: string }>;
}

export interface ReliabilityResponse {
  status: string;
  message?: string;
  results?: number | BulkUploadResults;
  total?: number;
  page?: number;
  pages?: number;
  data?: {
    reliabilityData?: ReliabilityData[];
    stats?: PerformanceStats;
    topPerformers?: ReliabilityData[];
    performanceHistory?: ReliabilityData[];
    user?: any;
    period?: { year: number; month: number };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReliabilityService {
  private baseUrl = `${environment.baseUrl}/reliability`;

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

  // User routes (read-only access to their own data)
  getMyReliabilityData(page: number = 1, limit: number = 10, year?: number, month?: number): Observable<ReliabilityResponse> {
    let params = `?page=${page}&limit=${limit}`;
    if (year) params += `&year=${year}`;
    if (month) params += `&month=${month}`;

    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/my-data${params}`, {
      headers: this.getHeaders()
    });
  }

  // Manager routes (full CRUD access)
  getAllReliabilityData(params?: {
    page?: number;
    limit?: number;
    workerId?: string;
    daId?: string;
    managerId?: string;
    minScore?: number;
    maxScore?: number;
    year?: number;
    month?: number;
    search?: string;
  }): Observable<ReliabilityResponse> {
    let queryParams = '?';
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams += `${key}=${value}&`;
        }
      });
    }

    // Remove trailing '&' or '?' if no params
    queryParams = queryParams.endsWith('&') ? queryParams.slice(0, -1) : queryParams;
    queryParams = queryParams === '?' ? '' : queryParams;

    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  // Get aggregated team member performance
  getAggregatedTeamPerformance(params?: {
    page?: number;
    limit?: number;
    year?: number;
    month?: number;
    search?: string;
  }): Observable<ReliabilityResponse> {
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
    
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/aggregated${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  getReliabilityData(id: string): Observable<ReliabilityResponse> {
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createReliabilityData(data: Omit<ReliabilityData, '_id' | 'createdAt' | 'updatedAt'>): Observable<ReliabilityResponse> {
    return this.http.post<ReliabilityResponse>(`${this.baseUrl}/`, data, {
      headers: this.getHeaders()
    });
  }

  updateReliabilityData(id: string, data: Partial<ReliabilityData>): Observable<ReliabilityResponse> {
    return this.http.patch<ReliabilityResponse>(`${this.baseUrl}/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  deleteReliabilityData(id: string): Observable<ReliabilityResponse> {
    return this.http.delete<ReliabilityResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Analytics and reporting
  getPerformanceStats(): Observable<ReliabilityResponse> {
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/stats`, {
      headers: this.getHeaders()
    });
  }

  getTopPerformers(limit: number = 10): Observable<ReliabilityResponse> {
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/top-performers?limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  getPerformanceByPeriod(year: number, month: number): Observable<ReliabilityResponse> {
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/period/${year}/${month}`, {
      headers: this.getHeaders()
    });
  }

  getUserPerformanceHistory(daId: string, page: number = 1, limit: number = 12): Observable<ReliabilityResponse> {
    return this.http.get<ReliabilityResponse>(`${this.baseUrl}/user/${daId}/history?page=${page}&limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  bulkCreateReliabilityData(data: any[]): Observable<ReliabilityResponse> {
    return this.http.post<ReliabilityResponse>(`${this.baseUrl}/bulk`, { data }, {
      headers: this.getHeaders()
    });
  }
}
