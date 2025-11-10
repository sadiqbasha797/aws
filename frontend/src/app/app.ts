import { Component, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, Sidebar, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  currentRoute = '';
  isAuthenticated = false;

  constructor(
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize route - use location.path() which is more reliable on initial load
    this.currentRoute = this.getCurrentPath();
    this.updateLayoutState();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateLayoutState();
        this.cdr.detectChanges();
      });
  }

  ngOnInit() {
    // Ensure route is set correctly after initialization
    this.currentRoute = this.getCurrentPath();
    this.updateLayoutState();
    this.cdr.detectChanges();
  }

  private getCurrentPath(): string {
    // Try router.url first (most accurate for Angular routing)
    // Fall back to location.path() (Angular's location service)
    // Final fallback to window.location.pathname (always available, even before router init)
    if (this.router.url && this.router.url !== '/') {
      return this.router.url;
    }
    const locationPath = this.location.path();
    if (locationPath) {
      // Remove query params and hash for comparison
      return locationPath.split('?')[0].split('#')[0];
    }
    // Fallback to browser's pathname (always available)
    return typeof window !== 'undefined' ? window.location.pathname : '';
  }

  private updateLayoutState() {
    this.isAuthenticated = this.authService.isAuthenticated();
  }

  isLoginPage(): boolean {
    // Always check the current route directly to ensure accuracy
    // Use window.location.pathname as the primary source since it's always available
    // even before Angular router is fully initialized, preventing sidebar flash on login page
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/login' || pathname.startsWith('/login/')) {
        return true;
      }
    }
    
    // Fallback to router/location for programmatic navigation
    const currentUrl = this.getCurrentPath();
    const normalizedPath = currentUrl.split('?')[0].split('#')[0];
    return normalizedPath === '/login' || normalizedPath.startsWith('/login/');
  }
}
