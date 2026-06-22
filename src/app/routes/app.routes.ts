import { Routes } from '@angular/router';

import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';

const temporaryPage = () =>
  import('./route-placeholder').then((component) => component.RoutePlaceholder);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    title: 'Login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('../layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/auth/login/login-page').then((component) => component.LoginPage),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../layouts/app-layout/app-layout').then((component) => component.AppLayout),
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: temporaryPage,
      },
      {
        path: 'farms',
        title: 'Fazendas',
        loadComponent: temporaryPage,
      },
      {
        path: 'users',
        title: 'Usuários',
        loadComponent: temporaryPage,
      },
      {
        path: 'farm-users',
        title: 'Usuários por fazenda',
        loadComponent: temporaryPage,
      },
      {
        path: 'categories',
        title: 'Categorias',
        loadComponent: temporaryPage,
      },
      {
        path: 'transactions',
        title: 'Transações',
        loadComponent: temporaryPage,
      },
      {
        path: 'upcoming-bills',
        title: 'Contas futuras',
        loadComponent: temporaryPage,
      },
      {
        path: 'profile',
        title: 'Perfil',
        loadComponent: temporaryPage,
      },
    ],
  },
  // Temporary route for visual validation of shared UI components. Remove after the design system is stabilized.
  {
    path: 'ui-test',
    title: 'UI Test',
    loadComponent: () =>
      import('../pages/ui-test/ui-test-page').then((component) => component.UiTestPage),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
