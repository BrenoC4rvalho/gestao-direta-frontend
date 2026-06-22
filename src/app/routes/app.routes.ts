import { Routes } from '@angular/router';

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
    loadComponent: temporaryPage,
  },
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
