import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from './environment';

export interface ReliabilityDoc {
  _id?: string;
  document: {
    filename: string;
    originalName: string;
    s3Key: string;
    s3Url: string;
    fileSize: number;
    mimeType: string;
  };
  processname?: string;
  job_id?: string;
  year?: number;
  month?: number;
  createdBy: string;
  managerId?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReliabilityDocResponse {
  status: string;
  message?: string;
  results?: number;
  total?: number;
  page?: number;
  pages?: number;
  data?: {
    reliabilityDoc?: ReliabilityDoc;
    reliabilityDocs?: ReliabilityDoc[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReliabilityDocService {
  private baseUrl = `${environment.baseUrl}/reliability-docs`;

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

  getAllReliabilityDocs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    processname?: string;
    job_id?: string;
    year?: number;
    month?: number;
  }): Observable<ReliabilityDocResponse> {
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

    return this.http.get<ReliabilityDocResponse>(`${this.baseUrl}/${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  getReliabilityDoc(id: string): Observable<ReliabilityDocResponse> {
    return this.http.get<ReliabilityDocResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createReliabilityDoc(file: File, processname?: string, job_id?: string, year?: number, month?: number): Observable<ReliabilityDocResponse> {
    const formData = new FormData();
    formData.append('document', file);
    if (processname) {
      formData.append('processname', processname);
    }
    if (job_id) {
      formData.append('job_id', job_id);
    }
    if (year) {
      formData.append('year', year.toString());
    }
    if (month) {
      formData.append('month', month.toString());
    }

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
    });

    return this.http.post<ReliabilityDocResponse>(`${this.baseUrl}/`, formData, {
      headers: headers
    });
  }

  updateReliabilityDoc(id: string, file: File | null, processname?: string, job_id?: string, year?: number, month?: number): Observable<ReliabilityDocResponse> {
    const formData = new FormData();
    if (file) {
      formData.append('document', file);
    }
    if (processname !== undefined) {
      formData.append('processname', processname);
    }
    if (job_id !== undefined) {
      formData.append('job_id', job_id);
    }
    if (year !== undefined) {
      formData.append('year', year.toString());
    }
    if (month !== undefined) {
      formData.append('month', month.toString());
    }

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
    });

    return this.http.patch<ReliabilityDocResponse>(`${this.baseUrl}/${id}`, formData, {
      headers: headers
    });
  }

  deleteReliabilityDoc(id: string): Observable<ReliabilityDocResponse> {
    return this.http.delete<ReliabilityDocResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }
}

