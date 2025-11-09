import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuickLinkService, QuickLinkCreateRequest } from '../services/quick-link.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-quick-link-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-link-form.html',
  styleUrls: ['./quick-link-form.css']
})
export class QuickLinkFormComponent implements OnInit {
  quickLinkData: QuickLinkCreateRequest = {
    title: '',
    link: ''
  };

  loading = false;
  error = '';
  isEditMode = false;
  quickLinkId: string | null = null;

  constructor(
    private quickLinkService: QuickLinkService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.quickLinkId = params['id'];
        this.loadQuickLink();
      }
    });
  }

  loadQuickLink(): void {
    if (!this.quickLinkId) return;

    this.loading = true;
    this.error = '';

    this.quickLinkService.getQuickLinkById(this.quickLinkId).subscribe({
      next: (response) => {
        this.quickLinkData = {
          title: response.quickLink.title,
          link: response.quickLink.link
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading Quick Link:', error);
        this.error = 'Failed to load Quick Link. Please try again.';
        this.loading = false;
        // Redirect to list if not found
        setTimeout(() => {
          this.router.navigate(['/quick-links']);
        }, 2000);
      }
    });
  }

  saveQuickLink(): void {
    // Validation
    if (!this.quickLinkData.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    if (!this.quickLinkData.link.trim()) {
      this.error = 'Link is required';
      return;
    }

    // Basic URL validation
    let link = this.quickLinkData.link.trim();
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      link = `https://${link}`;
    }

    this.loading = true;
    this.error = '';

    const quickLinkData = {
      ...this.quickLinkData,
      link: link
    };

    if (this.isEditMode && this.quickLinkId) {
      // Update existing quick link
      this.quickLinkService.updateQuickLink(this.quickLinkId, quickLinkData).subscribe({
        next: (response) => {
          this.router.navigate(['/quick-links']);
        },
        error: (error) => {
          console.error('Error updating Quick Link:', error);
          this.error = error.error?.details || error.error?.error || 'Failed to update Quick Link. Please try again.';
          this.loading = false;
        }
      });
    } else {
      // Create new quick link
      this.quickLinkService.createQuickLink(quickLinkData).subscribe({
        next: (response) => {
          this.router.navigate(['/quick-links']);
        },
        error: (error) => {
          console.error('Error creating Quick Link:', error);
          this.error = error.error?.details || error.error?.error || 'Failed to create Quick Link. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/quick-links']);
  }
}

