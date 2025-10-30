import { Component, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  showLoginLayout = false; // Default to dashboard layout initially

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    // Check initial route immediately
    this.currentRoute = this.router.url;
    this.updateLayoutState();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.updateLayoutState();
      });
  }

  ngOnInit() {
    // Update layout state again after initialization
    this.updateLayoutState();
  }

  private updateLayoutState() {
    this.isAuthenticated = this.authService.isAuthenticated();
    const isLoginRoute = this.currentRoute === '/login' || this.currentRoute.startsWith('/login');

    // Show login layout only if on login route (regardless of auth status)
    // This ensures login page always shows without sidebar/navbar
    this.showLoginLayout = isLoginRoute;

    console.log('Layout state - route:', this.currentRoute, 'authenticated:', this.isAuthenticated, 'showLogin:', this.showLoginLayout);
  }

  isLoginPage(): boolean {
    return this.showLoginLayout;
  }
}
