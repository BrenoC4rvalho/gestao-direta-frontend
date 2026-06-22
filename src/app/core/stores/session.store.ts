import { computed, Injectable, signal } from '@angular/core';

import { AuthUser } from '../models/auth.models';

export interface SessionState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SessionStore {
  private readonly state = signal<SessionState>({
    user: null,
    loading: false,
    initialized: false,
  });

  readonly user = computed(() => this.state().user);
  readonly loading = computed(() => this.state().loading);
  readonly initialized = computed(() => this.state().initialized);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly userName = computed(() => this.user()?.name ?? null);
  readonly userEmail = computed(() => this.user()?.email ?? null);
  readonly userType = computed(() => this.user()?.userType ?? null);
  readonly isAdmin = computed(() => this.userType() === 'ADMIN');

  setUser(user: AuthUser | null): void {
    this.state.update((state) => ({ ...state, user }));
  }

  setLoading(value: boolean): void {
    this.state.update((state) => ({ ...state, loading: value }));
  }

  setInitialized(value: boolean): void {
    this.state.update((state) => ({ ...state, initialized: value }));
  }

  clear(): void {
    this.state.set({
      user: null,
      loading: false,
      initialized: true,
    });
  }
}
