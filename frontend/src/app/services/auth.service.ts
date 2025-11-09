import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './environment';

export interface LoginRequest {
  email: string;
  password: string;
  userType?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.baseUrl}/auth`;

  constructor(private http: HttpClient) { }

  // User authentication
  registerUser(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register/user`, data);
  }

  loginUser(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/user`, data);
  }

  forgotPasswordUser(data: ForgotPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/forgot-password/user`, data);
  }

  resetPasswordUser(token: string, data: ResetPasswordRequest): Observable<AuthResponse> {
    return this.http.patch<AuthResponse>(`${this.baseUrl}/reset-password/user/${token}`, data);
  }

  verifyEmailUser(token: string): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.baseUrl}/verify-email/user/${token}`);
  }

  // Manager authentication
  registerManager(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register/manager`, data);
  }

  loginManager(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/manager`, data);
  }

  forgotPasswordManager(data: ForgotPasswordRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/forgot-password/manager`, data);
  }

  resetPasswordManager(token: string, data: ResetPasswordRequest): Observable<AuthResponse> {
    return this.http.patch<AuthResponse>(`${this.baseUrl}/reset-password/manager/${token}`, data);
  }

  verifyEmailManager(token: string): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.baseUrl}/verify-email/manager/${token}`);
  }

  // Common operations
  logout(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/logout`, {});
  }

  // Token management
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
