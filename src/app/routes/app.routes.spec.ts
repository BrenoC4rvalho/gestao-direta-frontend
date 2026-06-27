import { authGuard } from '../core/guards/auth.guard';
import { guestGuard } from '../core/guards/guest.guard';
import { CategoriesPage } from '../pages/categories/categories-page';
import { FarmUsersPage } from '../pages/farm-users/farm-users-page';

import { routes } from './app.routes';

describe('routes', () => {
  it('should register auth, app and ui-test routes with expected guards', async () => {
    const loginRoute = routes.find((route) => route.path === 'login');
    const appLayoutRoute = routes.find((route) => route.path === '' && Array.isArray(route.children));
    const uiTestRoute = routes.find((route) => route.path === 'ui-test');

    expect(loginRoute?.canActivate).toContain(guestGuard);
    expect(loginRoute?.children?.[0].path).toBe('');
    expect(appLayoutRoute?.canActivate).toContain(authGuard);
    expect(appLayoutRoute?.children?.some((route) => route.path === 'dashboard')).toBe(true);
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
    expect(appLayoutRoute?.children?.some((route) => route.path === 'profile')).toBe(true);
    expect(uiTestRoute?.canActivate).toBeUndefined();
    expect(uiTestRoute).toBeTruthy();
  });
});
