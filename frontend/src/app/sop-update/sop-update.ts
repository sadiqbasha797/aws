import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SOPService, SOP, SOPCreateRequest } from '../services/sop.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-update',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-update.html',
  styleUrls: ['./sop-update.css']
})
export class SOPUpdateComponent implements OnInit {
  sop: SOP | null = null;
  loading = false;
  error = '';
  creating = false;
  createError = '';

  // Form data
  formData: SOPCreateRequest = {
    title: '',
    description: '',
    process: '',
    tags: '',
    status: 'draft'
  };

  // File upload
  selectedFiles: FileList | null = null;

  // User info
  userRole = '';
  userId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sopService: SOPService,
    private authService: AuthService
  ) {
    this.initializeUserInfo();
  }

  private initializeUserInfo(): void {
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role || 'user';
        this.userId = payload.userId || payload.id || '';
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
        this.userId = '';
      }
    }
  }

  ngOnInit(): void {
    const sopId = this.route.snapshot.paramMap.get('id');
    if (sopId) {
      this.loadSOP(sopId);
    } else {
      this.error = 'Invalid SOP ID';
    }
  }

  loadSOP(id: string): void {
    this.loading = true;
    this.error = '';

    this.sopService.getSOPById(id).subscribe({
      next: (response) => {
        this.sop = response.sop;
        
        // Keep form empty for fresh upload (don't pre-populate)
        this.formData = {
          title: '',
          description: '',
          process: '',
          tags: '',
          status: 'draft'
        };
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading SOP:', error);
        this.error = 'Failed to load SOP details. Please try again.';
        this.loading = false;
      }
    });
  }

  onFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validate file types and sizes
      const validFiles: File[] = [];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!allowedTypes.includes(file.type)) {
          this.createError = `File "${file.name}" has an unsupported format. Please upload PDF, Word, Excel, PowerPoint, text, or image files.`;
          return;
        }
        
        if (file.size > maxSize) {
          this.createError = `File "${file.name}" is too large. Maximum size is 10MB.`;
          return;
        }
        
        validFiles.push(file);
      }

      if (validFiles.length > 5) {
        this.createError = 'Maximum 5 files can be uploaded at once.';
        return;
      }

      this.selectedFiles = files;
      this.createError = '';
    }
  }

  onSubmit(): void {
    if (!this.sop) {
      return;
    }

    // Validate form
    if (!this.formData.title || !this.formData.title.trim()) {
      this.createError = 'Title is required';
      return;
    }

    this.creating = true;
    this.createError = '';

    // Prepare data for new version
    const versionData: SOPCreateRequest = {
      title: this.formData.title.trim(),
      description: this.formData.description?.trim() || '',
      process: this.formData.process?.trim() || '',
      tags: this.formData.tags?.trim() || '',
      status: this.formData.status
    };

    this.sopService.createSOPVersion(this.sop._id, versionData, this.selectedFiles || undefined).subscribe({
      next: (response) => {
        this.creating = false;
        alert(`New version created successfully! This is now Version ${response.sop.versionNumber}.`);
        this.router.navigate(['/sops', response.sop._id]);
      },
      error: (error) => {
        console.error('Error creating SOP version:', error);
        this.createError = error.error?.details || 'Failed to create new version. Please try again.';
        this.creating = false;
      }
    });
  }

  cancel(): void {
    if (this.sop) {
      this.router.navigate(['/sops', this.sop._id]);
    } else {
      this.router.navigate(['/sops']);
    }
  }

  goBack(): void {
    this.cancel();
  }

  clearFileSelection(): void {
    this.selectedFiles = null;
    this.createError = '';
    const fileInput = window.document.getElementById('documentFiles') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getSelectedFileNames(): string[] {
    if (!this.selectedFiles) return [];
    return Array.from(this.selectedFiles).map(file => file.name);
  }

  getSelectedFilesSize(): number {
    if (!this.selectedFiles) return 0;
    return Array.from(this.selectedFiles).reduce((total, file) => total + file.size, 0);
  }

  formatFileSize(bytes: number): string {
    return this.sopService.formatFileSize(bytes);
  }

  triggerFileInput(): void {
    const fileInput = window.document.getElementById('documentFiles') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
}
