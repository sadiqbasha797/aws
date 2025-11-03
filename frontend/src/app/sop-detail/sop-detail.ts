import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SOPService, SOP, SOPDocument } from '../services/sop.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-detail.html',
  styleUrls: ['./sop-detail.css']
})
export class SOPDetailComponent implements OnInit {
  sop: SOP | null = null;
  loading = false;
  error = '';
  
  // Document upload
  uploadingDocuments = false;
  uploadError = '';
  selectedFiles: FileList | null = null;
  showUploadSection = false;
  
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
    // Subscribe to route params to handle navigation between versions
    this.route.paramMap.subscribe(params => {
      const sopId = params.get('id');
      if (sopId) {
        this.loadSOP(sopId);
      } else {
        this.error = 'Invalid SOP ID';
      }
    });
  }

  loadSOP(id: string): void {
    this.loading = true;
    this.error = '';
    // Reset upload section when loading new SOP
    this.showUploadSection = false;
    this.selectedFiles = null;
    this.uploadError = '';

    this.sopService.getSOPById(id).subscribe({
      next: (response) => {
        this.sop = response.sop;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading SOP:', error);
        this.error = 'Failed to load SOP details. Please try again.';
        this.loading = false;
      }
    });
  }

  toggleUploadSection(): void {
    this.showUploadSection = !this.showUploadSection;
    if (!this.showUploadSection) {
      this.clearFileSelection();
    }
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
          this.uploadError = `File "${file.name}" has an unsupported format. Please upload PDF, Word, Excel, PowerPoint, text, or image files.`;
          return;
        }
        
        if (file.size > maxSize) {
          this.uploadError = `File "${file.name}" is too large. Maximum size is 10MB.`;
          return;
        }
        
        validFiles.push(file);
      }

      if (validFiles.length > 5) {
        this.uploadError = 'Maximum 5 files can be uploaded at once.';
        return;
      }

      this.selectedFiles = files;
      this.uploadError = '';
    }
  }

  uploadDocuments(): void {
    if (!this.selectedFiles || !this.sop) {
      return;
    }

    this.uploadingDocuments = true;
    this.uploadError = '';

    this.sopService.addDocuments(this.sop._id, this.selectedFiles).subscribe({
      next: (response) => {
        this.sop = response.sop;
        this.selectedFiles = null;
        this.uploadingDocuments = false;
        
        // Reset file input
        const fileInput = window.document.getElementById('documentFiles') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        console.error('Error uploading documents:', error);
        this.uploadError = error.error?.details || 'Failed to upload documents. Please try again.';
        this.uploadingDocuments = false;
      }
    });
  }

  removeDocument(document: SOPDocument): void {
    if (!this.sop || !confirm('Are you sure you want to remove this document?')) {
      return;
    }

    this.sopService.removeDocument(this.sop._id, document._id).subscribe({
      next: (response) => {
        this.sop = response.sop;
      },
      error: (error) => {
        console.error('Error removing document:', error);
        alert('Failed to remove document. Please try again.');
      }
    });
  }

  downloadDocument(document: SOPDocument): void {
    this.sopService.downloadDocument(document.s3Key).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.originalName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
        alert('Failed to download document. Please try again.');
      }
    });
  }

  getFileIcon(mimeType: string): string {
    return this.sopService.getFileIcon(mimeType);
  }

  formatFileSize(bytes: number): string {
    return this.sopService.formatFileSize(bytes);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  canEditSOP(): boolean {
    // Only the creator can edit the SOP
    return !!(this.sop && this.sop.createdBy && this.sop.createdBy.userId === this.userId);
  }

  canDeleteSOP(): boolean {
    // Only the creator can delete the SOP
    return !!(this.sop && this.sop.createdBy && this.sop.createdBy.userId === this.userId);
  }

  canAddDocuments(): boolean {
    return this.sopService.canAddDocuments(this.sop!);
  }

  canRemoveDocument(document: SOPDocument): boolean {
    // Only the uploader can remove their own document
    // Managers can also remove any document
    if (this.userRole === 'manager') {
      return true;
    }
    
    // Check if current user uploaded this document
    return document.uploadedBy && document.uploadedBy.userId === this.userId;
  }

  editSOP(): void {
    if (this.sop && this.canEditSOP()) {
      this.router.navigate(['/sops', this.sop._id, 'edit']);
    }
  }

  deleteSOP(): void {
    if (!this.sop || !this.canDeleteSOP()) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${this.sop.title}"?\n\nThis will move the SOP to the bin where it can be restored within 30 days.`;
    
    if (confirm(confirmMessage)) {
      this.sopService.softDeleteSOP(this.sop._id).subscribe({
        next: (response) => {
          alert(response.message);
          this.router.navigate(['/sops']);
        },
        error: (error) => {
          console.error('Error deleting SOP:', error);
          alert('Failed to delete SOP. Please try again.');
        }
      });
    }
  }


  viewDocument(document: SOPDocument): void {
    this.sopService.getDocumentViewUrl(document.s3Key).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Error getting document view URL:', error);
        alert('Failed to open document. Please try again.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/sops']);
  }

  clearFileSelection(): void {
    this.selectedFiles = null;
    this.uploadError = '';
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

  reloadSOP(): void {
    const sopId = this.route.snapshot.paramMap.get('id');
    if (sopId) {
      this.loadSOP(sopId);
    }
  }

  triggerFileInput(): void {
    const fileInput = window.document.getElementById('documentFiles') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
}
