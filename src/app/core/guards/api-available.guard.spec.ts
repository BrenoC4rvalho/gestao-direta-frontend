import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';

import { routes } from '../../routes/app.routes';
import { authGuard } from './auth.guard';
import { apiAvailableGuard } from './api-available.guard';
import { SystemStatusService } from '../services/system-status.service';

type GuardResult = boolean | UrlTree;

async function resolveGuardResult(result: unknown): Promise<GuardResult> {
  if (isObservable(result)) {
    return firstValueFrom(result) as Promise<GuardResult>;
  }

  return result as GuardResult;
}

describe('apiAvailableGuard', () => {
  let router: Router;
  let systemStatusService: {
    getStatus: ReturnType<typeof vi.fn>;
    isHealthy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    systemStatusService = {
      getStatus: vi.fn().mockReturnValue(of({ status: 'UP', database: 'UP' })),
      isHealthy: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SystemStatusService, useValue: systemStatusService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should allow navigation when the API and database are healthy', async () => {
    const result = TestBed.runInInjectionContext(() => apiAvailableGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(systemStatusService.getStatus).toHaveBeenCalledTimes(1);
    expect(systemStatusService.isHealthy).toHaveBeenCalledWith({ status: 'UP', database: 'UP' });
    expect(resolved).toBe(true);
  });

  it('should redirect when the API is degraded', async () => {
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'DEGRADED', database: 'UP' }));
    systemStatusService.isHealthy.mockReturnValueOnce(false);

    const result = TestBed.runInInjectionContext(() => apiAvailableGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(router.serializeUrl(resolved as UrlTree)).toBe('/server-error');
  });

  it('should redirect when the database is down', async () => {
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'UP', database: 'DOWN' }));
    systemStatusService.isHealthy.mockReturnValueOnce(false);

    const result = TestBed.runInInjectionContext(() => apiAvailableGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(router.serializeUrl(resolved as UrlTree)).toBe('/server-error');
  });

  it('should redirect when the status request fails', async () => {
    systemStatusService.getStatus.mockReturnValueOnce(throwError(() => new Error('network')));

    const result = TestBed.runInInjectionContext(() => apiAvailableGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(router.serializeUrl(resolved as UrlTree)).toBe('/server-error');
  });

  it('should only be configured on protected app routes', () => {
    const landingRoute = routes.find((route) => route.path === '' && route.pathMatch === 'full');
    const serverErrorRoute = routes.find((route) => route.path === 'server-error');
    const appLayoutRoute = routes.find((route) => route.path === '' && Array.isArray(route.children));

    expect(landingRoute?.canActivate).toBeUndefined();
    expect(serverErrorRoute?.canActivate).toBeUndefined();
    expect(appLayoutRoute?.canActivate).toEqual([apiAvailableGuard, authGuard]);
  });
});
