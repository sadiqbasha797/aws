import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface TeamMember {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  da_id: string;
  workerId?: string;
  managerId?: string;
  isActive: boolean;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeamMemberStats {
  totalTeamMembers: number;
  activeTeamMembers: number;
  inactiveTeamMembers: number;
}

export interface TeamMemberResponse {
  status: string;
  message?: string;
  results?: number;
  total?: number;
  page?: number;
  pages?: number;
  data?: {
    teamMember?: TeamMember;
    teamMembers?: TeamMember[];
    stats?: TeamMemberStats;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TeamMemberService {
  private baseUrl = 'http://localhost:7000/api/team-members';

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

  // Get current team member profile
  getMe(): Observable<TeamMemberResponse> {
    return this.http.get<TeamMemberResponse>(`${this.baseUrl}/me`, {
      headers: this.getHeaders()
    });
  }

  updateMe(data: Partial<TeamMember>): Observable<TeamMemberResponse> {
    return this.http.patch<TeamMemberResponse>(`${this.baseUrl}/me`, data, {
      headers: this.getHeaders()
    });
  }

  // Team member management
  getAllTeamMembers(): Observable<TeamMemberResponse> {
    return this.http.get<TeamMemberResponse>(`${this.baseUrl}/`, {
      headers: this.getHeaders()
    });
  }

  getTeamMember(id: string): Observable<TeamMemberResponse> {
    return this.http.get<TeamMemberResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  createTeamMember(data: Omit<TeamMember, '_id'>): Observable<TeamMemberResponse> {
    return this.http.post<TeamMemberResponse>(`${this.baseUrl}/`, data, {
      headers: this.getHeaders()
    });
  }

  updateTeamMember(id: string, data: Partial<TeamMember>): Observable<TeamMemberResponse> {
    return this.http.patch<TeamMemberResponse>(`${this.baseUrl}/${id}`, data, {
      headers: this.getHeaders()
    });
  }

  deleteTeamMember(id: string): Observable<TeamMemberResponse> {
    return this.http.delete<TeamMemberResponse>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Team member status management
  deactivateTeamMember(id: string): Observable<TeamMemberResponse> {
    return this.http.patch<TeamMemberResponse>(`${this.baseUrl}/${id}/deactivate`, {}, {
      headers: this.getHeaders()
    });
  }

  activateTeamMember(id: string): Observable<TeamMemberResponse> {
    return this.http.patch<TeamMemberResponse>(`${this.baseUrl}/${id}/activate`, {}, {
      headers: this.getHeaders()
    });
  }

  // Team member statistics
  getTeamMemberStats(): Observable<TeamMemberResponse> {
    return this.http.get<TeamMemberResponse>(`${this.baseUrl}/stats`, {
      headers: this.getHeaders()
    });
  }

  // Get team members by manager
  getTeamMembersByManager(managerId: string): Observable<TeamMemberResponse> {
    return this.http.get<TeamMemberResponse>(`${this.baseUrl}/manager/${managerId}`, {
      headers: this.getHeaders()
    });
  }
}
