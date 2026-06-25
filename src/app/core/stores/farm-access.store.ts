import { computed, Injectable, signal } from '@angular/core';

import {
  FarmAccessResponse,
  NO_FARM_ACCESS_PERMISSIONS,
} from '../models/farm-access.models';

export interface FarmAccessState {
  access: FarmAccessResponse | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FarmAccessStore {
  private readonly state = signal<FarmAccessState>({
    access: null,
    loading: false,
    error: null,
  });

  readonly access = computed(() => this.state().access);
  readonly permissions = computed(
    () => this.access()?.permissions ?? NO_FARM_ACCESS_PERMISSIONS,
  );
  readonly role = computed(() => this.access()?.role ?? null);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly hasAccess = computed(() => this.access() !== null);

  readonly canViewFarm = computed(() => this.permissions().canViewFarm);
  readonly canEditFarm = computed(() => this.permissions().canEditFarm);
  readonly canChangeFarmStatus = computed(
    () => this.permissions().canChangeFarmStatus,
  );
  readonly canManageFarmUsers = computed(() => this.permissions().canManageFarmUsers);
  readonly canViewFinancial = computed(() => this.permissions().canViewFinancial);
  readonly canManageTransactions = computed(
    () => this.permissions().canManageTransactions,
  );
  readonly canManageCategories = computed(() => this.permissions().canManageCategories);
  readonly canManageGlobalCategories = computed(
    () => this.permissions().canManageGlobalCategories,
  );
  readonly canCreateFarm = computed(() => this.permissions().canCreateFarm);

  setAccess(access: FarmAccessResponse | null): void {
    this.state.update((state) => ({ ...state, access }));
  }

  setLoading(value: boolean): void {
    this.state.update((state) => ({ ...state, loading: value }));
  }

  setError(value: string | null): void {
    this.state.update((state) => ({ ...state, error: value }));
  }

  clear(): void {
    this.state.set({
      access: null,
      loading: false,
      error: null,
    });
  }
}
