import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  managerId?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface UserResponse {
  success: boolean;
  message: string;
  data?: User | User[];
  stats?: UserStats;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:7000/api/users';

  constructor(private http: HttpClient) { }

  // Get current user profile
  getMe(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`);
  }

  updateMe(data: Partial<User>): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/me`, data);
  }

  // User management
  getAllUsers(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/`);
  }

  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  createUser(data: Omit<User, 'id'>): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/`, data);
  }

  updateUser(id: string, data: Partial<User>): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}`, data);
  }

  deleteUser(id: string): Observable<UserResponse> {
    return this.http.delete<UserResponse>(`${this.baseUrl}/${id}`);
  }

  // User status management
  deactivateUser(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activateUser(id: string): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.baseUrl}/${id}/activate`, {});
  }

  // User statistics
  getUserStats(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/stats`);
  }

  // Get users by manager
  getUsersByManager(managerId: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/manager/${managerId}`);
  }
}
