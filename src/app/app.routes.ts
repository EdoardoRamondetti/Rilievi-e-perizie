import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then( m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then( m => m.DashboardComponent)
  },
  {
    path: 'nuovaPerizia',
    loadComponent: () => import('./nuova-perizia/nuova-perizia.component').then( m => m.NuovaPeriziaComponent)
  }
];
