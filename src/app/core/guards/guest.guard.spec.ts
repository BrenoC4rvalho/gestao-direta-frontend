import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthUser } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { SessionStore } from '../stores/session.store';

import { guestGuard } from './guest.guard';

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('guestGuard', () => {
  it('should redirect when authenticated', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => of({ user }) } },
      ],
    });

    const router = TestBed.inject(Router);
    const store = TestBed.inject(SessionStore);
    store.setUser(user);
    store.setInitialized(true);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(router.serializeUrl(result as never)).toBe('/dashboard');
  });

  it('should allow when session check fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => throwError(() => new Error('401')) } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    const resolved = await new Promise<unknown>((resolve) => {
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(resolve);
      }
    });

    expect(resolved).toBe(true);
  });
});
