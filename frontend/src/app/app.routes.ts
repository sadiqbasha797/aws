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
    path: 'reliability/create',
    loadComponent: () => import('./reliability-create/reliability-create').then(m => m.ReliabilityCreateComponent)
  },
  {
    path: 'reliability/excel-upload',
    loadComponent: () => import('./excel-column-mapping/excel-column-mapping').then(m => m.ExcelColumnMappingComponent)
  },
  {
    path: 'audit-docs/create',
    loadComponent: () => import('./audit-doc-create/audit-doc-create').then(m => m.AuditDocCreateComponent)
  },
  {
    path: 'audit-docs/:id/edit',
    loadComponent: () => import('./audit-doc-create/audit-doc-create').then(m => m.AuditDocCreateComponent)
  },
  {
    path: 'productivity',
    loadComponent: () => import('./productivity/productivity').then(m => m.Productivity)
  },
  {
    path: 'productivity/create',
    loadComponent: () => import('./productivity-create/productivity-create').then(m => m.ProductivityCreateComponent)
  },
  {
    path: 'productivity/excel-upload',
    loadComponent: () => import('./excel-column-mapping/excel-column-mapping').then(m => m.ExcelColumnMappingComponent)
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
    path: 'processes',
    loadComponent: () => import('./process-list/process-list').then(m => m.ProcessListComponent)
  },
  {
    path: 'processes/create',
    loadComponent: () => import('./process-form/process-form').then(m => m.ProcessFormComponent)
  },
  {
    path: 'processes/:id/edit',
    loadComponent: () => import('./process-form/process-form').then(m => m.ProcessFormComponent)
  },
  {
    path: 'quick-links',
    loadComponent: () => import('./quick-links/quick-links').then(m => m.QuickLinksComponent)
  },
  {
    path: 'quick-links/create',
    loadComponent: () => import('./quick-link-form/quick-link-form').then(m => m.QuickLinkFormComponent)
  },
  {
    path: 'quick-links/:id/edit',
    loadComponent: () => import('./quick-link-form/quick-link-form').then(m => m.QuickLinkFormComponent)
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
