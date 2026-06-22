import { routes } from './app.routes';

describe('routes', () => {
  it('should register auth, app and ui-test routes', () => {
    const loginRoute = routes.find((route) => route.path === 'login');
    const appLayoutRoute = routes.find((route) => route.path === '' && Array.isArray(route.children));
    const uiTestRoute = routes.find((route) => route.path === 'ui-test');

    expect(loginRoute?.children?.[0].path).toBe('');
    expect(appLayoutRoute?.children?.some((route) => route.path === 'dashboard')).toBe(true);
    expect(appLayoutRoute?.children?.some((route) => route.path === 'farms')).toBe(true);
    expect(appLayoutRoute?.children?.some((route) => route.path === 'profile')).toBe(true);
    expect(uiTestRoute).toBeTruthy();
  });
});
