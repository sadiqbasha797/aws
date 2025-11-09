import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from './environment';

export interface Process {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessResponse {
  status: string;
  message?: string;
  data?: {
    process?: Process;
    processes?: Process[];
  };
  results?: number;
  total?: number;
  page?: number;
  pages?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProcessService {
  private baseUrl = `${environment.baseUrl}/processes`;

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

  // Get all processes with filtering and pagination
  getAllProcesses(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<ProcessResponse> {
    let queryParams = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
      queryParams = searchParams.toString();
    }
    
    const url = queryParams ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    return this.http.get<ProcessResponse>(url, { headers: this.getHeaders() });
  }

  // Get process by ID
  getProcessById(id: string): Observable<ProcessResponse> {
    return this.http.get<ProcessResponse>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Create new process
  createProcess(name: string): Observable<ProcessResponse> {
    return this.http.post<ProcessResponse>(this.baseUrl, { name }, { headers: this.getHeaders() });
  }

  // Update process
  updateProcess(id: string, name: string): Observable<ProcessResponse> {
    return this.http.put<ProcessResponse>(`${this.baseUrl}/${id}`, { name }, { headers: this.getHeaders() });
  }

  // Delete process
  deleteProcess(id: string): Observable<ProcessResponse> {
    return this.http.delete<ProcessResponse>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }
}

