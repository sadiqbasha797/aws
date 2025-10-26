import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  showUserMenu = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    // This will be implemented when we add sidebar toggle functionality
    console.log('Toggle sidebar');
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.removeToken();
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still navigate to login even if logout fails
        this.authService.removeToken();
        this.router.navigate(['/login']);
      }
    });
  }
}
