import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SOPService, BinItem } from '../services/sop.service';

@Component({
  selector: 'app-bin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bin.html',
  styleUrls: ['./bin.css']
})
export class BinComponent implements OnInit {
  binItems: BinItem[] = [];
  loading = false;
  error = '';
  selectedCollection = 'all';

  constructor(
    private sopService: SOPService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBinItems();
  }

  loadBinItems(): void {
    this.loading = true;
    this.error = '';

    const collection = this.selectedCollection === 'all' ? undefined : this.selectedCollection;

    this.sopService.getBinItems(collection).subscribe({
      next: (response) => {
        this.binItems = response.items;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading bin items:', error);
        this.error = 'Failed to load bin items. Please try again.';
        this.loading = false;
      }
    });
  }

  filterByCollection(collection: string): void {
    this.selectedCollection = collection;
    this.loadBinItems();
  }

  restoreItem(item: BinItem): void {
    if (!confirm(`Are you sure you want to restore this ${item.collectionName.slice(0, -1)}?`)) {
      return;
    }

    this.sopService.restoreFromBin(item._id).subscribe({
      next: (response) => {
        alert('Item restored successfully!');
        this.loadBinItems(); // Reload the list
      },
      error: (error) => {
        console.error('Error restoring item:', error);
        alert('Failed to restore item. Please try again.');
      }
    });
  }

  getItemTitle(item: BinItem): string {
    if (item.data && item.data.title) {
      return item.data.title;
    }
    return `${item.collectionName.slice(0, -1)} (${item.originalId.substring(0, 8)}...)`;
  }

  getItemDescription(item: BinItem): string {
    if (item.data && item.data.description) {
      return item.data.description;
    }
    return 'No description available';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getExpiryWarningClass(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 3) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (daysUntilExpiry <= 7) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-green-100 text-green-800 border-green-200';
    }
  }

  getCollectionIcon(collectionName: string): string {
    switch (collectionName) {
      case 'sops':
        return 'fas fa-file-alt';
      case 'teambatches':
        return 'fas fa-users';
      default:
        return 'fas fa-box';
    }
  }

  getCollectionColor(collectionName: string): string {
    switch (collectionName) {
      case 'sops':
        return 'bg-orange-500';
      case 'teambatches':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }

  goBack(): void {
    this.router.navigate(['/sops']);
  }

  getDaysRemainingText(days: number): string {
    if (days <= 0) {
      return 'Expiring soon';
    } else if (days === 1) {
      return '1 day remaining';
    } else {
      return `${days} days remaining`;
    }
  }
}
