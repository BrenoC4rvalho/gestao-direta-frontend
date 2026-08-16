import { apiAvailableGuard } from '../core/guards/api-available.guard';
import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';
import {
  peopleManagementDefaultRedirectGuard,
  peopleManagementGuard,
} from '../core/guards/people-management.guard';
import { AppLayout } from '../layouts/app-layout/app-layout';
import { AuthLayout } from '../layouts/auth-layout/auth-layout';
import { DashboardPage } from '../pages/dashboard/dashboard-page';
import { LandingPage } from '../pages/landing/landing-page';
import { ServerErrorPage } from '../pages/server-error/server-error-page';
import { PeopleManagementPage } from '../pages/people-management/people-management-page';
import { RegistrationsPage } from '../pages/registrations/registrations-page';

import { routes } from './app.routes';

describe('routes', () => {
  it('should render landing at / without API guard', async () => {
    const landingRoute = routes.find((route) => route.path === '' && route.pathMatch === 'full');

    expect(landingRoute?.canActivate).toBeUndefined();
    expect(landingRoute?.redirectTo).toBeUndefined();
    expect(landingRoute?.loadComponent).toBeTypeOf('function');

    const landingComponent = await (landingRoute?.loadComponent as () => Promise<unknown>)();
    expect(landingComponent).toBe(LandingPage);
  });

  it('should keep /server-error public and outside AppLayout', async () => {
    const serverErrorRoute = routes.find((route) => route.path === 'server-error');
    const appLayoutRoute = routes.find(
      (route) => route.path === '' && Array.isArray(route.children),
    );

    expect(serverErrorRoute?.canActivate).toBeUndefined();
    expect(serverErrorRoute?.children).toBeUndefined();
    expect(appLayoutRoute?.children?.some((route) => route.path === 'server-error')).toBe(false);
    expect(serverErrorRoute?.loadComponent).toBeTypeOf('function');

    const serverErrorComponent = await (
      serverErrorRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(serverErrorComponent).toBe(ServerErrorPage);
  });

  it('should keep login public except for guest guard', async () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.canActivate).toEqual([guestGuard]);
    expect(loginRoute?.children?.[0].path).toBe('');
    expect(loginRoute?.loadComponent).toBeTypeOf('function');

    const authLayoutComponent = await (loginRoute?.loadComponent as () => Promise<unknown>)();
    expect(authLayoutComponent).toBe(AuthLayout);
  });

  it('should protect private routes with API availability before auth', async () => {
    const appLayoutRoute = routes.find(
      (route) => route.path === '' && Array.isArray(route.children),
    );

    expect(appLayoutRoute?.canActivate).toEqual([apiAvailableGuard, authGuard]);
    expect(appLayoutRoute?.loadComponent).toBeTypeOf('function');

    const appLayoutComponent = await (appLayoutRoute?.loadComponent as () => Promise<unknown>)();
    expect(appLayoutComponent).toBe(AppLayout);
  });

  it('should keep /dashboard under the auth-protected app route', async () => {
    const appLayoutRoute = routes.find(
      (route) => route.path === '' && Array.isArray(route.children),
    );
    const dashboardRoute = appLayoutRoute?.children?.find((route) => route.path === 'dashboard');

    expect(appLayoutRoute?.canActivate).toContain(authGuard);
    expect(dashboardRoute?.data?.['title']).toBe('Dashboard');
    expect(dashboardRoute?.loadComponent).toBeTypeOf('function');

    const dashboardComponent = await (dashboardRoute?.loadComponent as () => Promise<unknown>)();
    expect(dashboardComponent).toBe(DashboardPage);
  });
});

describe('people management routes', () => {
  it('should group users and farm links under /people and preserve legacy redirects', async () => {
    const appLayoutRoute = routes.find(
      (route) => route.path === '' && Array.isArray(route.children),
    );
    const peopleRoute = appLayoutRoute?.children?.find((route) => route.path === 'people');
    const usersRoute = peopleRoute?.children?.find((route) => route.path === 'users');
    const farmUsersRoute = peopleRoute?.children?.find((route) => route.path === 'farm-users');
    const defaultRoute = peopleRoute?.children?.find((route) => route.path === '');
    const legacyUsersRoute = appLayoutRoute?.children?.find((route) => route.path === 'users');
    const legacyFarmUsersRoute = appLayoutRoute?.children?.find(
      (route) => route.path === 'farm-users',
    );

    expect(peopleRoute?.data).toEqual({
      title: 'Usuários e vínculos',
      subtitle: 'Gerencie usuários cadastrados e seus vínculos com as fazendas.',
    });
    expect(defaultRoute?.canActivate).toEqual([peopleManagementDefaultRedirectGuard]);
    expect(usersRoute?.canActivate).toEqual([peopleManagementGuard]);
    expect(farmUsersRoute?.canActivate).toEqual([peopleManagementGuard]);
    expect(legacyUsersRoute?.redirectTo).toBe('people/users');
    expect(legacyFarmUsersRoute?.redirectTo).toBe('people/farm-users');

    const component = await (peopleRoute?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(PeopleManagementPage);
  });
});

describe('registrations routes', () => {
  it('should group categories and production activities under /registrations and preserve legacy redirects', async () => {
    const appLayoutRoute = routes.find(
      (route) => route.path === '' && Array.isArray(route.children),
    );
    const registrationsRoute = appLayoutRoute?.children?.find(
      (route) => route.path === 'registrations',
    );
    const categoriesRoute = registrationsRoute?.children?.find(
      (route) => route.path === 'categories',
    );
    const activitiesRoute = registrationsRoute?.children?.find(
      (route) => route.path === 'production-activities',
    );
    const defaultRoute = registrationsRoute?.children?.find((route) => route.path === '');
    const legacyCategoriesRoute = appLayoutRoute?.children?.find(
      (route) => route.path === 'categories',
    );
    const legacyActivitiesRoute = appLayoutRoute?.children?.find(
      (route) => route.path === 'production-activities',
    );

    expect(registrationsRoute?.data).toEqual({
      title: 'Cadastro',
      subtitle: 'Gerencie categorias financeiras e atividades produtivas da fazenda.',
    });
    expect(defaultRoute?.redirectTo).toBe('categories');
    expect(categoriesRoute?.loadComponent).toBeTypeOf('function');
    expect(activitiesRoute?.loadComponent).toBeTypeOf('function');
    expect(legacyCategoriesRoute?.redirectTo).toBe('registrations/categories');
    expect(legacyActivitiesRoute?.redirectTo).toBe('registrations/production-activities');

    const component = await (registrationsRoute?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(RegistrationsPage);
  });
});
