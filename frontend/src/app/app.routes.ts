import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'reliability',
    loadComponent: () => import('./reliability/reliability').then(m => m.Reliability)
  },
  {
    path: 'productivity',
    loadComponent: () => import('./productivity/productivity').then(m => m.Productivity)
  },
  {
    path: 'sops',
    loadComponent: () => import('./sop-list/sop-list').then(m => m.SOPListComponent)
  },
  {
    path: 'bin',
    loadComponent: () => import('./bin/bin').then(m => m.BinComponent)
  },
  {
    path: 'team-management',
    loadComponent: () => import('./team-management/team-management').then(m => m.TeamManagementComponent)
  },
  {
    path: 'team-members/create',
    loadComponent: () => import('./team-member-form/team-member-form').then(m => m.TeamMemberFormComponent)
  },
  {
    path: 'team-members/:id/edit',
    loadComponent: () => import('./team-member-form/team-member-form').then(m => m.TeamMemberFormComponent)
  },
  {
    path: 'batches/create',
    loadComponent: () => import('./batch-form/batch-form').then(m => m.BatchFormComponent)
  },
  {
    path: 'batches/:id/edit',
    loadComponent: () => import('./batch-form/batch-form').then(m => m.BatchFormComponent)
  },
  {
    path: 'sops/create',
    loadComponent: () => import('./sop-create/sop-create').then(m => m.SOPCreateComponent)
  },
  {
    path: 'sops/:id/edit',
    loadComponent: () => import('./sop-edit/sop-edit').then(m => m.SOPEditComponent)
  },
  {
    path: 'sops/:id/upload-version',
    loadComponent: () => import('./sop-update/sop-update').then(m => m.SOPUpdateComponent)
  },
  {
    path: 'sops/:id',
    loadComponent: () => import('./sop-detail/sop-detail').then(m => m.SOPDetailComponent)
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
