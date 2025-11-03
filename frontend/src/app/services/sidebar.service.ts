import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarOpen = signal<boolean>(false);

  constructor() {}

  isOpen() {
    return this.sidebarOpen();
  }

  toggle() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  open() {
    this.sidebarOpen.set(true);
  }

  close() {
    this.sidebarOpen.set(false);
  }

  getSidebarOpenSignal() {
    return this.sidebarOpen.asReadonly();
  }
}

