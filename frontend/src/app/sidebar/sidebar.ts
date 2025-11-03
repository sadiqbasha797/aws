import { Component, OnInit, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  userRole = '';
  isOpen = false;

  constructor(private sidebarService: SidebarService) {
    // React to sidebar state changes
    effect(() => {
      this.isOpen = this.sidebarService.isOpen();
    });
  }

  ngOnInit(): void {
    this.getUserRole();
    this.isOpen = this.sidebarService.isOpen();
  }

  getUserRole(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = payload.role || 'user';
      } catch (error) {
        console.error('Error parsing token:', error);
        this.userRole = 'user';
      }
    }
  }

  isManager(): boolean {
    return this.userRole === 'manager';
  }

  closeSidebar() {
    // Only close sidebar on mobile screens
    if (window.innerWidth < 1024) {
      this.sidebarService.close();
    }
  }
}
