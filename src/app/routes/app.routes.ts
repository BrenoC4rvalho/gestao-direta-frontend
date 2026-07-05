import { Routes } from '@angular/router';

import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Gestão Direta — Finanças simplificadas para a Agricultura',
    loadComponent: () =>
      import('../pages/landing/landing-page').then((component) => component.LandingPage),
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
        data: {
          title: 'Dashboard',
          subtitle: 'Aqui está o resumo financeiro da sua fazenda hoje.',
        },
        loadComponent: () =>
          import('../pages/dashboard/dashboard-page').then((component) => component.DashboardPage),
      },
      {
        path: 'farms',
        title: 'Fazendas',
        data: {
          title: 'Fazendas',
          subtitle: 'Gerencie as propriedades disponíveis para acompanhamento financeiro.',
        },
        loadComponent: () =>
          import('../pages/farms/farms-page').then((component) => component.FarmsPage),
      },
      {
        path: 'users',
        title: 'Usuários',
        data: {
          title: 'Usuários',
          subtitle: 'Gerencie os usuários cadastrados no sistema.',
        },
        loadComponent: () =>
          import('../pages/users/users-page').then((component) => component.UsersPage),
      },
      {
        path: 'farm-users',
        title: 'Usuários por fazenda',
        data: {
          title: 'Vínculos da fazenda',
          subtitle: 'Gerencie os usuários vinculados à fazenda selecionada.',
        },
        loadComponent: () =>
          import('../pages/farm-users/farm-users-page').then(
            (component) => component.FarmUsersPage,
          ),
      },
      {
        path: 'categories',
        title: 'Categorias',
        data: {
          title: 'Categorias financeiras',
          subtitle: 'Organize receitas e despesas por categorias da fazenda.',
        },
        loadComponent: () =>
          import('../pages/categories/categories-page').then(
            (component) => component.CategoriesPage,
          ),
      },
      {
        path: 'production-activities',
        title: 'Atividades produtivas',
        data: {
          title: 'Atividades produtivas',
          subtitle: 'Gerencie culturas e atividades usadas no planejamento das safras.',
        },
        loadComponent: () =>
          import('../pages/production-activities/production-activities-page').then(
            (component) => component.ProductionActivitiesPage,
          ),
      },
      {
        path: 'transactions',
        title: 'Transações',
        data: {
          title: 'Movimentações financeiras',
          subtitle: 'Acompanhe receitas e despesas da fazenda selecionada.',
        },
        loadComponent: () =>
          import('../pages/transactions/transactions-page').then(
            (component) => component.TransactionsPage,
          ),
      },
      {
        path: 'harvests',
        title: 'Safras',
        data: {
          title: 'Safras',
          subtitle: 'Acompanhe ciclos produtivos, custos, receitas e resultados estimados.',
        },
        loadComponent: () =>
          import('../pages/harvests/harvests-page').then(
            (component) => component.HarvestsPage,
          ),
      },
      {
        path: 'harvests/:id',
        title: 'Detalhes da safra',
        data: {
          title: 'Detalhes da safra',
          subtitle: 'Acompanhe resultado, indicadores e movimentacoes vinculadas.',
        },
        loadComponent: () =>
          import('../pages/harvest-season-details/harvest-season-details-page').then(
            (component) => component.HarvestSeasonDetailsPage,
          ),
      },
      {
        path: 'upcoming-bills',
        title: 'Contas a vencer',
        data: {
          title: 'Contas a vencer',
          subtitle: 'Acompanhe despesas pendentes e vencimentos da fazenda selecionada.',
        },
        loadComponent: () =>
          import('../pages/upcoming-bills/upcoming-bills-page').then(
            (component) => component.UpcomingBillsPage,
          ),
      },
      {
        path: 'profile',
        title: 'Perfil',
        data: {
          title: 'Minha conta',
          subtitle: 'Gerencie seus dados de acesso e informações pessoais.',
        },
        loadComponent: () =>
          import('../pages/profile/profile-page').then((component) => component.ProfilePage),
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
