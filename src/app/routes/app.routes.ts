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
        loadComponent: () =>
          import('../pages/dashboard/dashboard-page').then((component) => component.DashboardPage),
      },
      {
        path: 'farms',
        title: 'Fazendas',
        loadComponent: () =>
          import('../pages/farms/farms-page').then((component) => component.FarmsPage),
      },
      {
        path: 'users',
        title: 'Usuários',
        loadComponent: () =>
          import('../pages/users/users-page').then((component) => component.UsersPage),
      },
      {
        path: 'farm-users',
        title: 'Usuários por fazenda',
        loadComponent: () =>
          import('../pages/farm-users/farm-users-page').then(
            (component) => component.FarmUsersPage,
          ),
      },
      {
        path: 'categories',
        title: 'Categorias',
        loadComponent: () =>
          import('../pages/categories/categories-page').then(
            (component) => component.CategoriesPage,
          ),
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
