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
  readonly initials = computed(() => {
    const user = this.user();

    return this.getInitials(user?.name) ?? this.getInitials(user?.email);
  });

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

  private getInitials(value: string | null | undefined): string | null {
    const normalized = value?.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      return null;
    }

    const parts = normalized.split(' ');

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
