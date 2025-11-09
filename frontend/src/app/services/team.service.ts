import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  phone?: string;
  joinDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private baseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }


  // Team Member Operations
  getAllTeamMembers(): Observable<{message: string, teamMembers: TeamMember[], count: number}> {
    return this.http.get<{message: string, teamMembers: TeamMember[], count: number}>(
      `${this.baseUrl}/team-members`,
      { headers: this.getHeaders() }
    );
  }

  getTeamMemberById(id: string): Observable<{message: string, teamMember: TeamMember}> {
    return this.http.get<{message: string, teamMember: TeamMember}>(
      `${this.baseUrl}/team-members/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createTeamMember(memberData: Partial<TeamMember>): Observable<{message: string, teamMember: TeamMember}> {
    return this.http.post<{message: string, teamMember: TeamMember}>(
      `${this.baseUrl}/team-members`,
      memberData,
      { headers: this.getHeaders() }
    );
  }

  updateTeamMember(id: string, memberData: Partial<TeamMember>): Observable<{message: string, teamMember: TeamMember}> {
    return this.http.patch<{message: string, teamMember: TeamMember}>(
      `${this.baseUrl}/team-members/${id}`,
      memberData,
      { headers: this.getHeaders() }
    );
  }

  deleteTeamMember(id: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(
      `${this.baseUrl}/team-members/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Helper Methods
  getUserRole(): string {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    return 'user';
  }

  isManager(): boolean {
    return this.getUserRole() === 'manager';
  }
}
