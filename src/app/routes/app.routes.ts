import { Routes } from '@angular/router';

import { apiAvailableGuard } from '../core/guards/api-available.guard';
import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';
import {
  peopleManagementDefaultRedirectGuard,
  peopleManagementGuard,
} from '../core/guards/people-management.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Gestão Direta — Gestão financeira para produtores rurais',
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
    path: 'forgot-password',
    title: 'Recuperar senha',
    loadComponent: () =>
      import('../layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/auth/forgot-password/forgot-password-page').then(
            (component) => component.ForgotPasswordPage,
          ),
      },
    ],
  },
  {
    path: 'forgot-password/verify',
    title: 'Validar código de recuperação',
    loadComponent: () =>
      import('../layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/auth/verify-recovery-code/verify-recovery-code-page').then(
            (component) => component.VerifyRecoveryCodePage,
          ),
      },
    ],
  },
  {
    path: 'forgot-password/reset',
    title: 'Redefinir senha',
    loadComponent: () =>
      import('../layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/auth/reset-password/reset-password-page').then(
            (component) => component.ResetPasswordPage,
          ),
      },
    ],
  },
  {
    path: 'password-recovery-success',
    title: 'Senha redefinida',
    loadComponent: () =>
      import('../layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../pages/auth/password-recovery-success/password-recovery-success-page').then(
            (component) => component.PasswordRecoverySuccessPage,
          ),
      },
    ],
  },
  {
    path: 'server-error',
    title: 'Servidor indisponível',
    loadComponent: () =>
      import('../pages/server-error/server-error-page').then(
        (component) => component.ServerErrorPage,
      ),
  },
  {
    path: '',
    canActivate: [apiAvailableGuard, authGuard],
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
        pathMatch: 'full',
        redirectTo: 'people/users',
      },
      {
        path: 'farm-users',
        pathMatch: 'full',
        redirectTo: 'people/farm-users',
      },
      {
        path: 'people',
        title: 'Usuários e vínculos',
        data: {
          title: 'Usuários e vínculos',
          subtitle: 'Gerencie usuários cadastrados e seus vínculos com as fazendas.',
        },
        loadComponent: () =>
          import('../pages/people-management/people-management-page').then(
            (component) => component.PeopleManagementPage,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            canActivate: [peopleManagementDefaultRedirectGuard],
            loadComponent: () =>
              import('../pages/people-management/people-management-page').then(
                (component) => component.PeopleManagementPage,
              ),
          },
          {
            path: 'users',
            title: 'Usuários',
            canActivate: [peopleManagementGuard],
            loadComponent: () =>
              import('../pages/users/users-page').then((component) => component.UsersPage),
          },
          {
            path: 'farm-users',
            title: 'Vínculos da fazenda',
            canActivate: [peopleManagementGuard],
            loadComponent: () =>
              import('../pages/farm-users/farm-users-page').then(
                (component) => component.FarmUsersPage,
              ),
          },
        ],
      },
      {
        path: 'categories',
        pathMatch: 'full',
        redirectTo: 'registrations/categories',
      },
      {
        path: 'production-activities',
        pathMatch: 'full',
        redirectTo: 'registrations/production-activities',
      },
      {
        path: 'registrations',
        title: 'Cadastro',
        data: {
          title: 'Cadastro',
          subtitle: 'Gerencie categorias financeiras e atividades produtivas da fazenda.',
        },
        loadComponent: () =>
          import('../pages/registrations/registrations-page').then(
            (component) => component.RegistrationsPage,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'categories',
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
            path: 'production-activities',
            title: 'Atividades produtivas',
            loadComponent: () =>
              import('../pages/production-activities/production-activities-page').then(
                (component) => component.ProductionActivitiesPage,
              ),
          },
        ],
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
        path: 'transactions/pending-approvals',
        title: 'Movimentações pendentes',
        data: {
          title: 'Movimentações pendentes',
          subtitle:
            'Revise as movimentações identificadas pelo Telegram antes de incluí-las no controle financeiro.',
        },
        loadComponent: () =>
          import('../pages/pending-transactions/pending-transactions-page').then(
            (component) => component.PendingTransactionsPage,
          ),
      },
      {
        path: 'reports/financial',
        title: 'Relatório Financeiro',
        data: {
          title: 'Relatório Financeiro',
          subtitle: 'Visão consolidada das movimentações, resultados e indicadores.',
        },
        loadComponent: () =>
          import('../pages/reports/financial-report/financial-report-page').then(
            (component) => component.FinancialReportPage,
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
          import('../pages/harvests/harvests-page').then((component) => component.HarvestsPage),
      },
      {
        path: 'harvests/:id',
        title: 'Detalhes da safra',
        data: {
          dynamicHeader: 'harvest-details',
        },
        loadComponent: () =>
          import('../pages/harvest-season-details/harvest-season-details-page').then(
            (component) => component.HarvestSeasonDetailsPage,
          ),
      },
      {
        path: 'upcoming-bills',
        title: 'Agenda Financeira',
        data: {
          title: 'Agenda Financeira',
          subtitle: 'Acompanhe contas em aberto, vencidas e pendentes da fazenda selecionada.',
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
