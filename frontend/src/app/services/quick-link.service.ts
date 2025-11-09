import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface QuickLink {
  _id: string;
  title: string;
  link: string;
  createdBy: {
    userId: string;
    userType: 'TeamMember' | 'Manager';
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuickLinkListResponse {
  message: string;
  quickLinks: QuickLink[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface QuickLinkResponse {
  message: string;
  quickLink: QuickLink;
}

export interface QuickLinkCreateRequest {
  title: string;
  link: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuickLinkService {
  private baseUrl = `${environment.baseUrl}/quick-links`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all Quick Links with filtering and pagination
  getAllQuickLinks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Observable<QuickLinkListResponse> {
    let queryParams = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      queryParams = searchParams.toString();
    }
    
    const url = queryParams ? `${this.baseUrl}?${queryParams}` : this.baseUrl;
    return this.http.get<QuickLinkListResponse>(url, { headers: this.getHeaders() });
  }

  // Get Quick Link by ID
  getQuickLinkById(id: string): Observable<QuickLinkResponse> {
    return this.http.get<QuickLinkResponse>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Get current user's Quick Links
  getMyQuickLinks(): Observable<{message: string, quickLinks: QuickLink[], count: number}> {
    return this.http.get<{message: string, quickLinks: QuickLink[], count: number}>(`${this.baseUrl}/my`, { headers: this.getHeaders() });
  }

  // Create new Quick Link
  createQuickLink(quickLinkData: QuickLinkCreateRequest): Observable<QuickLinkResponse> {
    return this.http.post<QuickLinkResponse>(this.baseUrl, quickLinkData, { headers: this.getHeaders() });
  }

  // Update Quick Link
  updateQuickLink(id: string, quickLinkData: Partial<QuickLinkCreateRequest>): Observable<QuickLinkResponse> {
    return this.http.put<QuickLinkResponse>(`${this.baseUrl}/${id}`, quickLinkData, { headers: this.getHeaders() });
  }

  // Delete Quick Link
  deleteQuickLink(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Format date for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Get user role from token
  private getUserRole(): string {
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

  // Check if user can edit/delete (both manager and team member can)
  canEditQuickLink(quickLink: QuickLink): boolean {
    const userRole = this.getUserRole();
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.id;
        
        // Both manager and team member can edit their own links
        // Managers can also edit all links
        return userRole === 'manager' || quickLink.createdBy.userId === userId;
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    return false;
  }
}

