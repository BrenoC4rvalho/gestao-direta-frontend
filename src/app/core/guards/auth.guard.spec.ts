import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

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

describe('authGuard', () => {
  it('should allow when authenticated', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => of({ user }) } },
      ],
    });

    const store = TestBed.inject(SessionStore);
    store.setUser(user);
    store.setInitialized(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('should redirect when session check fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => throwError(() => new Error('401')) } },
      ],
    });

    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    const resolved = await new Promise<unknown>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(resolve);
      }
    });

    expect(router.serializeUrl(resolved as never)).toBe('/login');
  });
});
