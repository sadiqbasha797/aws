import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeamService, TeamMember, TeamBatch } from '../services/team.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-batch-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-form.html',
  styleUrls: ['./batch-form.css']
})
export class BatchFormComponent implements OnInit {
  batchForm = {
    batchName: '',
    batchNumber: '',
    batchDescription: '',
    batchMembers: [] as string[],
    status: 'active',
    tags: ''
  };

  teamMembers: TeamMember[] = [];
  selectedImage: File | null = null;
  isEditMode = false;
  batchId: string | null = null;
  loading = false;
  loadingMembers = false;
  error = '';

  constructor(
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.checkManagerAccess();
  }

  ngOnInit(): void {
    this.loadTeamMembers();
    this.batchId = this.route.snapshot.paramMap.get('id');
    if (this.batchId) {
      this.isEditMode = true;
      this.loadBatch();
    }
  }

  private checkManagerAccess(): void {
    const userRole = this.teamService.getUserRole();
    if (userRole !== 'manager') {
      alert('Access denied. Manager role required.');
      this.router.navigate(['/dashboard']);
    }
  }

  loadTeamMembers(): void {
    this.loadingMembers = true;
    this.teamService.getAllTeamMembers().subscribe({
      next: (response) => {
        this.teamMembers = response.teamMembers;
        this.loadingMembers = false;
      },
      error: (error) => {
        console.error('Error loading team members:', error);
        this.loadingMembers = false;
      }
    });
  }

  loadBatch(): void {
    if (!this.batchId) return;

    this.loading = true;
    this.teamService.getBatchById(this.batchId).subscribe({
      next: (response) => {
        const batch = response.batch;
        this.batchForm = {
          batchName: batch.batchName,
          batchNumber: batch.batchNumber,
          batchDescription: batch.batchDescription || '',
          batchMembers: batch.batchMembers || [],
          status: batch.status || 'active',
          tags: batch.tags?.join(', ') || ''
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading batch:', error);
        this.error = 'Failed to load batch';
        this.loading = false;
      }
    });
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error = 'Please select an image file';
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'Image size should not exceed 5MB';
        return;
      }
      this.selectedImage = file;
      this.error = '';
    }
  }

  toggleMemberInBatch(memberId: string): void {
    const index = this.batchForm.batchMembers.indexOf(memberId);
    if (index > -1) {
      this.batchForm.batchMembers.splice(index, 1);
    } else {
      this.batchForm.batchMembers.push(memberId);
    }
  }

  isMemberInBatch(memberId: string): boolean {
    return this.batchForm.batchMembers.includes(memberId);
  }

  saveBatch(): void {
    if (!this.batchForm.batchName || !this.batchForm.batchNumber) {
      this.error = 'Batch name and number are required';
      return;
    }

    this.loading = true;
    this.error = '';

    if (this.isEditMode && this.batchId) {
      // Update existing batch
      const updateData = {
        ...this.batchForm,
        tags: this.batchForm.tags.split(',').map(t => t.trim()).filter(t => t)
      };
      
      this.teamService.updateBatch(this.batchId, updateData).subscribe({
        next: () => {
          this.router.navigate(['/team-management']);
        },
        error: (error) => {
          console.error('Error updating batch:', error);
          this.error = error.error?.message || 'Failed to update batch';
          this.loading = false;
        }
      });
    } else {
      // Create new batch
      const formData = new FormData();
      formData.append('batchName', this.batchForm.batchName);
      formData.append('batchNumber', this.batchForm.batchNumber);
      if (this.batchForm.batchDescription) {
        formData.append('batchDescription', this.batchForm.batchDescription);
      }
      if (this.batchForm.status) {
        formData.append('status', this.batchForm.status);
      }
      if (this.batchForm.tags) {
        formData.append('tags', this.batchForm.tags);
      }
      // Add batch members
      if (this.batchForm.batchMembers && this.batchForm.batchMembers.length > 0) {
        formData.append('batchMembers', JSON.stringify(this.batchForm.batchMembers));
      }
      if (this.selectedImage) {
        formData.append('batchImage', this.selectedImage);
      }
      
      this.teamService.createBatch(formData).subscribe({
        next: () => {
          this.router.navigate(['/team-management']);
        },
        error: (error) => {
          console.error('Error creating batch:', error);
          this.error = error.error?.message || 'Failed to create batch';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/team-management']);
  }
}

