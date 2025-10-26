import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginData: LoginRequest = {
    email: '',
    password: '',
    userType: ''
  };
  
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const loginRequest: LoginRequest = {
      email: this.loginData.email,
      password: this.loginData.password
    };

    // Call appropriate login method based on user type
    const loginObservable = this.loginData.userType === 'manager' 
      ? this.authService.loginManager(loginRequest)
      : this.authService.loginUser(loginRequest);

    loginObservable.subscribe({
      next: (response) => {
        console.log('Login response:', response); // Debug log
        console.log('Response success:', response.success);
        console.log('Response token:', response.token);
        
        if (response.success && response.token) {
          this.authService.setToken(response.token);
          this.successMessage = 'Login successful! Redirecting...';
          console.log('Token saved, navigating to dashboard...');
          
          // Navigate to dashboard immediately
          this.router.navigate(['/dashboard']).then(
            (success) => {
              console.log('Navigation success:', success);
              if (!success) {
                console.error('Navigation failed, trying window.location');
                window.location.href = '/dashboard';
              }
            },
            (error) => {
              console.error('Navigation error:', error);
              window.location.href = '/dashboard';
            }
          );
        } else {
          console.log('Login failed - success:', response.success, 'token:', response.token);
          this.errorMessage = response.message || 'Login failed';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Login error:', error); // Debug log
        this.errorMessage = error.error?.message || 'An error occurred during login';
        this.isLoading = false;
      }
    });
  }
}
