import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthUser } from '../models/auth.models';
import { AuthSessionService } from '../services/auth-session.service';
import { authInterceptor } from './auth.interceptor';
import { SessionStore } from '../stores/session.store';
import { ToastStore } from '../stores/toast.store';

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let router: Router;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);
    toastStore.clear();
  });

  afterEach(() => {
    httpTesting.verify();
    toastStore.clear();
  });

  it('should clear session, notify once and redirect after an authenticated 401', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const firstError = vi.fn();
    const secondError = vi.fn();

    http.get('/api/financial/summary').subscribe({ error: firstError });
    http.get('/api/financial/alerts').subscribe({ error: secondError });

    httpTesting.expectOne('/api/financial/summary').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    httpTesting.expectOne('/api/financial/alerts').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(firstError).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    expect(secondError).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    expect(sessionStore.user()).toBeNull();
    expect(sessionStore.initialized()).toBe(true);
    expect(toastStore.toasts()).toHaveLength(1);
    expect(toastStore.toasts()[0]?.title).toBe('Sua sessão expirou. Faça login novamente.');
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);

    await Promise.resolve();
  });

  it.each([
    '/api/auth/login',
    '/api/auth/session',
    '/api/auth/logout',
    '/api/auth/password-recovery/options',
  ])('should preserve public auth 401 responses for %s', (url) => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const error = vi.fn();

    http.post(url, {}).subscribe({ error });
    httpTesting.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    expect(sessionStore.user()).toEqual(user);
    expect(toastStore.toasts()).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([403, 500])('should not expire the session for HTTP %s', (status) => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const error = vi.fn();

    http.get('/api/financial/summary').subscribe({ error });
    httpTesting.expectOne('/api/financial/summary').flush(null, {
      status,
      statusText: status === 403 ? 'Forbidden' : 'Server Error',
    });

    expect(error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    expect(sessionStore.user()).toEqual(user);
    expect(toastStore.toasts()).toHaveLength(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should allow the session to be rebuilt after a new login', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('/api/financial/summary').subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/financial/summary').flush(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await Promise.resolve();

    sessionStore.setUser(user);
    toastStore.clear();

    http.get('/api/financial/summary').subscribe();
    httpTesting.expectOne('/api/financial/summary').flush({ ok: true });

    expect(sessionStore.user()).toEqual(user);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
