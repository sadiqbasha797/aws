import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface TeamBatch {
  _id: string;
  batchName: string;
  batchNumber: string;
  batchDescription?: string;
  batchMembers: string[]; // Array of team member IDs
  createdBy: {
    userId: string;
    userType: string;
    name: string;
    email: string;
  };
  batchImage?: {
    filename: string;
    originalName: string;
    s3Key: string;
    s3Url: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  };
  status?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private baseUrl = 'http://localhost:7000/api';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getHeadersForFormData(): HttpHeaders {
    const token = localStorage.getItem('token');
    // Don't set Content-Type for FormData - browser will set it automatically with boundary
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

  // Team Batch Operations
  getAllBatches(): Observable<{message: string, batches: TeamBatch[], count: number}> {
    return this.http.get<{message: string, batches: TeamBatch[], count: number}>(
      `${this.baseUrl}/team-batches`,
      { headers: this.getHeaders() }
    );
  }

  getBatchById(id: string): Observable<{message: string, batch: TeamBatch}> {
    return this.http.get<{message: string, batch: TeamBatch}>(
      `${this.baseUrl}/team-batches/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createBatch(batchData: FormData): Observable<{message: string, batch: TeamBatch}> {
    return this.http.post<{message: string, batch: TeamBatch}>(
      `${this.baseUrl}/team-batches`,
      batchData,
      { headers: this.getHeadersForFormData() }
    );
  }

  updateBatch(id: string, batchData: Partial<TeamBatch>): Observable<{message: string, batch: TeamBatch}> {
    return this.http.patch<{message: string, batch: TeamBatch}>(
      `${this.baseUrl}/team-batches/${id}`,
      batchData,
      { headers: this.getHeaders() }
    );
  }

  deleteBatch(id: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(
      `${this.baseUrl}/team-batches/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Batch Member Management
  addMembersToBatch(batchId: string, memberIds: string[]): Observable<{message: string, batch: TeamBatch}> {
    return this.http.post<{message: string, batch: TeamBatch}>(
      `${this.baseUrl}/team-batches/${batchId}/members`,
      { memberIds },
      { headers: this.getHeaders() }
    );
  }

  removeMemberFromBatch(batchId: string, memberId: string): Observable<{message: string, batch: TeamBatch}> {
    return this.http.delete<{message: string, batch: TeamBatch}>(
      `${this.baseUrl}/team-batches/${batchId}/members/${memberId}`,
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
