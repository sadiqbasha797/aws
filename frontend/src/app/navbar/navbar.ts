import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { SidebarService } from '../services/sidebar.service';
import { ManagerService } from '../services/manager.service';
import { TeamMemberService } from '../services/team-member.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  showUserMenu = false;
  userName: string = '';
  userRole: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private sidebarService: SidebarService,
    private managerService: ManagerService,
    private teamMemberService: TeamMemberService
  ) {}

  ngOnInit() {
    this.loadUserInfo();
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  loadUserInfo() {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload.role || 'user';

      if (role === 'manager') {
        this.managerService.getMe().subscribe({
          next: (response: any) => {
            // Backend returns { status: 'success', data: { manager } }
            const manager = response.data?.manager || response.data;
            if (manager) {
              this.userName = manager.name || payload.name || 'User';
              this.userRole = manager.role || 'Manager';
            } else {
              // Fallback to token data
              this.userName = payload.name || 'User';
              this.userRole = 'Manager';
            }
          },
          error: (error) => {
            console.error('Error loading manager info:', error);
            // Fallback to token data
            this.userName = payload.name || 'User';
            this.userRole = 'Manager';
          }
        });
      } else {
        this.teamMemberService.getMe().subscribe({
          next: (response: any) => {
            // Backend returns { status: 'success', data: { teamMember } }
            const teamMember = response.data?.teamMember;
            if (teamMember) {
              this.userName = teamMember.name || payload.name || 'User';
              this.userRole = 'Team Member';
            } else {
              // Fallback to token data
              this.userName = payload.name || 'User';
              this.userRole = 'Team Member';
            }
          },
          error: (error) => {
            console.error('Error loading team member info:', error);
            // Fallback to token data
            this.userName = payload.name || 'User';
            this.userRole = 'Team Member';
          }
        });
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      this.userName = 'User';
    }
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
