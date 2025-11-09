import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProcessService, Process } from '../services/process.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-form.html',
  styleUrls: ['./process-form.css']
})
export class ProcessFormComponent implements OnInit {
  isEditMode = false;
  editingId = '';
  loading = false;
  error = '';
  successMessage = '';
  userRole: string = '';

  processForm = {
    name: ''
  };

  constructor(
    private processService: ProcessService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check user role
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
      }
    }

    // Check if user is manager
    if (this.userRole !== 'manager') {
      this.router.navigate(['/processes']);
      return;
    }

    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.editingId = params['id'];
        this.loadProcess();
      }
    });
  }

  loadProcess() {
    this.loading = true;
    this.error = '';

    this.processService.getProcessById(this.editingId).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data?.process) {
          this.processForm.name = response.data.process.name;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading process:', error);
        this.error = 'Failed to load process';
        this.loading = false;
      }
    });
  }

  saveProcess() {
    if (!this.processForm.name.trim()) {
      this.error = 'Process name is required';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const operation = this.isEditMode
      ? this.processService.updateProcess(this.editingId, this.processForm.name.trim())
      : this.processService.createProcess(this.processForm.name.trim());

    operation.subscribe({
      next: (response) => {
        this.loading = false;
        if (response.status === 'success') {
          this.successMessage = this.isEditMode
            ? 'Process updated successfully'
            : 'Process created successfully';
          setTimeout(() => {
            this.router.navigate(['/processes']);
          }, 1000);
        } else {
          this.error = response.message || 'Operation failed';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving process:', error);
        this.error = error.error?.message || 'Failed to save process';
      }
    });
  }

  cancel() {
    this.router.navigate(['/processes']);
  }
}

