import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Manager {
  id?: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ManagerStats {
  totalManagers: number;
  activeManagers: number;
  inactiveManagers: number;
}

export interface ManagerResponse {
  success: boolean;
  message: string;
  data?: Manager | Manager[];
  stats?: ManagerStats;
}

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private baseUrl = 'http://localhost:7000/api/managers';

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

  // Get current manager profile
  getMe(): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/me`, {
      headers: this.getHeaders()
    });
  }

  updateMe(data: Partial<Manager>): Observable<ManagerResponse> {
    return this.http.patch<ManagerResponse>(`${this.baseUrl}/me`, data, {
      headers: this.getHeaders()
    });
  }

  // Manager management
  getAllManagers(): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/`);
  }

  getManager(id: string): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/${id}`);
  }

  createManager(data: Omit<Manager, 'id'>): Observable<ManagerResponse> {
    return this.http.post<ManagerResponse>(`${this.baseUrl}/`, data);
  }

  updateManager(id: string, data: Partial<Manager>): Observable<ManagerResponse> {
    return this.http.patch<ManagerResponse>(`${this.baseUrl}/${id}`, data);
  }

  deleteManager(id: string): Observable<ManagerResponse> {
    return this.http.delete<ManagerResponse>(`${this.baseUrl}/${id}`);
  }

  // Manager status management
  deactivateManager(id: string): Observable<ManagerResponse> {
    return this.http.patch<ManagerResponse>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activateManager(id: string): Observable<ManagerResponse> {
    return this.http.patch<ManagerResponse>(`${this.baseUrl}/${id}/activate`, {});
  }

  // Manager statistics
  getManagerStats(): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/stats`);
  }

  getManagerSpecificStats(managerId: string): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/${managerId}/stats`);
  }

  // Team member management
  getManagerTeamMembers(managerId: string): Observable<ManagerResponse> {
    return this.http.get<ManagerResponse>(`${this.baseUrl}/${managerId}/team-members`);
  }
}
