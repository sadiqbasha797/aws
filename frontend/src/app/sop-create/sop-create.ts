import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SOPService, SOPCreateRequest } from '../services/sop.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-create.html',
  styleUrls: ['./sop-create.css']
})
export class SOPCreateComponent {
  sopData: SOPCreateRequest = {
    title: '',
    process: '',
    sopUrl: ''
  };

  loading = false;
  error = '';

  constructor(
    private sopService: SOPService,
    private router: Router,
    private authService: AuthService
  ) {
    this.checkManagerAccess();
  }

  private checkManagerAccess(): void {
    const token = this.authService.getToken();
    let userRole = 'user';
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    if (userRole !== 'manager') {
      this.router.navigate(['/sops']);
    }
  }

  createSOP(): void {
    if (!this.sopData.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    this.loading = true;
    this.error = '';

    this.sopService.createSOP(this.sopData).subscribe({
      next: (response) => {
        this.router.navigate(['/sops']);
      },
      error: (error) => {
        console.error('Error creating SOP:', error);
        this.error = error.error?.details || 'Failed to create SOP. Please try again.';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sops']);
  }
}
