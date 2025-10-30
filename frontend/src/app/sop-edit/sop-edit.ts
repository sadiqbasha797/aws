import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SOPService, SOP, SOPCreateRequest } from '../services/sop.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sop-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sop-edit.html',
  styleUrls: ['./sop-edit.css']
})
export class SOPEditComponent implements OnInit {
  sop: SOP | null = null;
  loading = false;
  error = '';
  saving = false;
  saveError = '';

  // Form data
  formData: SOPCreateRequest = {
    title: '',
    description: '',
    process: '',
    tags: '',
    status: 'draft'
  };

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
        
        // Check if user can edit this SOP
        if (!this.canEditSOP()) {
          this.error = 'You do not have permission to edit this SOP';
          this.loading = false;
          return;
        }

        // Populate form data
        this.formData = {
          title: this.sop.title || '',
          description: this.sop.description || '',
          process: this.sop.process || '',
          tags: this.sop.tags?.join(', ') || '',
          status: this.sop.status || 'draft'
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

  canEditSOP(): boolean {
    // Only the creator can edit the SOP
    return !!(this.sop && this.sop.createdBy && this.sop.createdBy.userId === this.userId);
  }

  onSubmit(): void {
    if (!this.sop || !this.canEditSOP()) {
      return;
    }

    // Validate form
    if (!this.formData.title || !this.formData.title.trim()) {
      this.saveError = 'Title is required';
      return;
    }

    this.saving = true;
    this.saveError = '';

    // Prepare data for update
    const updateData: Partial<SOPCreateRequest> = {
      title: this.formData.title.trim(),
      description: this.formData.description?.trim() || '',
      process: this.formData.process?.trim() || '',
      tags: this.formData.tags?.trim() || '',
      status: this.formData.status
    };

    this.sopService.updateSOP(this.sop._id, updateData).subscribe({
      next: (response) => {
        this.sop = response.sop;
        this.saving = false;
        alert('SOP updated successfully');
        this.router.navigate(['/sops', this.sop._id]);
      },
      error: (error) => {
        console.error('Error updating SOP:', error);
        this.saveError = error.error?.details || 'Failed to update SOP. Please try again.';
        this.saving = false;
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
}
