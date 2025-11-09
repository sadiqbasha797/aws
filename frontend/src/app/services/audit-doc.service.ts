import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface AuditDoc {
  _id?: string;
  document: {
    filename: string;
    originalName: string;
    s3Key: string;
    s3Url: string;
    fileSize: number;
    mimeType: string;
  };
  date: Date | string;
  createdBy: string;
  managerId?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditDocResponse {
  status: string;
  message?: string;
  results?: number;
  total?: number;
  page?: number;
  pages?: number;
  data?: {
    auditDoc?: AuditDoc;
    auditDocs?: AuditDoc[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuditDocService {
  private baseUrl = 'http://localhost:7000/api/audit-docs';

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

  getAllAuditDocs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<AuditDocResponse> {
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

    return this.http.get<AuditDocResponse>(`${this.baseUrl}/${queryParams}`, {
      headers: this.getHeaders()
    });
  }

  getAuditDoc(id: string): Observable<AuditDocResponse> {
    return this.http.get<AuditDocResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createAuditDoc(file: File, date: string): Observable<AuditDocResponse> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('date', date);

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
    });

    return this.http.post<AuditDocResponse>(`${this.baseUrl}/`, formData, {
      headers: headers
    });
  }

  updateAuditDoc(id: string, file: File | null, date?: string): Observable<AuditDocResponse> {
    const formData = new FormData();
    if (file) {
      formData.append('document', file);
    }
    if (date) {
      formData.append('date', date);
    }

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
    });

    return this.http.patch<AuditDocResponse>(`${this.baseUrl}/${id}`, formData, {
      headers: headers
    });
  }

  deleteAuditDoc(id: string): Observable<AuditDocResponse> {
    return this.http.delete<AuditDocResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }
}

