import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';
import { CategoriesPage } from '../pages/categories/categories-page';
import { FarmUsersPage } from '../pages/farm-users/farm-users-page';
import { HarvestsPage } from '../pages/harvests/harvests-page';
import { ProfilePage } from '../pages/profile/profile-page';
import { TransactionsPage } from '../pages/transactions/transactions-page';
import { UpcomingBillsPage } from '../pages/upcoming-bills/upcoming-bills-page';

import { routes } from './app.routes';

describe('routes', () => {
  it('should register auth, app and ui-test routes with expected guards', async () => {
    const loginRoute = routes.find((route) => route.path === 'login');
    const appLayoutRoute = routes.find((route) => route.path === '' && Array.isArray(route.children));
    const uiTestRoute = routes.find((route) => route.path === 'ui-test');

    expect(loginRoute?.canActivate).toContain(guestGuard);
    expect(loginRoute?.children?.[0].path).toBe('');
    expect(appLayoutRoute?.canActivate).toContain(authGuard);
    const dashboardRoute = appLayoutRoute?.children?.find((route) => route.path === 'dashboard');
    expect(dashboardRoute?.data?.['title']).toBe('Dashboard');
    expect(appLayoutRoute?.children?.some((route) => route.path === 'farms')).toBe(true);
    expect(appLayoutRoute?.children?.some((route) => route.path === 'users')).toBe(true);
    const farmUsersRoute = appLayoutRoute?.children?.find((route) => route.path === 'farm-users');
    expect(farmUsersRoute?.loadComponent).toBeTypeOf('function');
    const farmUsersComponent = await (
      farmUsersRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(farmUsersComponent).toBe(FarmUsersPage);
    const categoriesRoute = appLayoutRoute?.children?.find((route) => route.path === 'categories');
    expect(categoriesRoute?.loadComponent).toBeTypeOf('function');
    const categoriesComponent = await (
      categoriesRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(categoriesComponent).toBe(CategoriesPage);
    const transactionsRoute = appLayoutRoute?.children?.find((route) => route.path === 'transactions');
    expect(transactionsRoute?.loadComponent).toBeTypeOf('function');
    const transactionsComponent = await (
      transactionsRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(transactionsComponent).toBe(TransactionsPage);
    const harvestsRoute = appLayoutRoute?.children?.find((route) => route.path === 'harvests');
    expect(harvestsRoute?.data?.['title']).toBe('Safras');
    expect(harvestsRoute?.loadComponent).toBeTypeOf('function');
    const harvestsComponent = await (
      harvestsRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(harvestsComponent).toBe(HarvestsPage);
    const upcomingBillsRoute = appLayoutRoute?.children?.find((route) => route.path === 'upcoming-bills');
    expect(upcomingBillsRoute?.loadComponent).toBeTypeOf('function');
    const upcomingBillsComponent = await (
      upcomingBillsRoute?.loadComponent as () => Promise<unknown>
    )();
    expect(upcomingBillsComponent).toBe(UpcomingBillsPage);
    const profileRoute = appLayoutRoute?.children?.find((route) => route.path === 'profile');
    expect(profileRoute?.data?.['title']).toBe('Minha conta');
    expect(profileRoute?.loadComponent).toBeTypeOf('function');
    const profileComponent = await (profileRoute?.loadComponent as () => Promise<unknown>)();
    expect(profileComponent).toBe(ProfilePage);
    expect(uiTestRoute?.canActivate).toBeUndefined();
    expect(uiTestRoute).toBeTruthy();
  });
});
