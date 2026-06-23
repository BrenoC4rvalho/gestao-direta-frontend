import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';

import { AuthUser } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { SessionStore } from '../stores/session.store';

import { authGuard } from './auth.guard';

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

type GuardResult = boolean | UrlTree;

async function resolveGuardResult(result: unknown): Promise<GuardResult> {
  if (isObservable(result)) {
    return firstValueFrom(result) as Promise<GuardResult>;
  }

  return result as GuardResult;
}

describe('authGuard', () => {
  let authService: { session: ReturnType<typeof vi.fn> };
  let router: Router;
  let store: SessionStore;

  beforeEach(() => {
    authService = {
      session: vi.fn().mockReturnValue(of({ user })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
    store = TestBed.inject(SessionStore);
  });

  it('should allow when already authenticated', () => {
    store.setUser(user);
    store.setInitialized(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(authService.session).not.toHaveBeenCalled();
  });

  it('should redirect to login when initialized without user', () => {
    store.setInitialized(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(authService.session).not.toHaveBeenCalled();
  });

  it('should call session and save user when not initialized', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(authService.session).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(true);
    expect(store.user()).toEqual(user);
    expect(store.initialized()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  it('should clear session and redirect to login when session check fails', async () => {
    authService.session.mockReturnValueOnce(throwError(() => new Error('401')));

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    const resolved = await resolveGuardResult(result);

    expect(authService.session).toHaveBeenCalledTimes(1);
    expect(router.serializeUrl(resolved as UrlTree)).toBe('/login');
    expect(store.user()).toBeNull();
    expect(store.initialized()).toBe(true);
    expect(store.loading()).toBe(false);
  });
});
