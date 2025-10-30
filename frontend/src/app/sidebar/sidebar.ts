import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit {
  userRole = '';

  ngOnInit(): void {
    this.getUserRole();
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
}
