import { computed, Injectable, signal } from '@angular/core';

import { Farm } from '../models/farm.models';

export interface SelectedFarmState {
  farms: Farm[];
  selectedFarm: Farm | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SelectedFarmStore {
  private readonly state = signal<SelectedFarmState>({
    farms: [],
    selectedFarm: null,
    loading: false,
    error: null,
    loaded: false,
  });

  readonly farms = computed(() => this.state().farms);
  readonly selectedFarm = computed(() => this.state().selectedFarm);
  readonly selectedFarmId = computed(() => this.selectedFarm()?.id ?? null);
  readonly hasFarms = computed(() => this.farms().length > 0);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly loaded = computed(() => this.state().loaded);

  setFarms(farms: Farm[]): void {
    this.state.update((state) => {
      const selectedFarm =
        farms.find(
          (farm) => farm.id === state.selectedFarm?.id && farm.status === 'ACTIVE',
        ) ??
        farms.find((farm) => farm.status === 'ACTIVE') ??
        null;

      return {
        ...state,
        farms,
        selectedFarm,
        loaded: true,
        error: null,
      };
    });
  }

  upsertFarm(farm: Farm): void {
    this.state.update((state) => {
      const farmExists = state.farms.some((item) => item.id === farm.id);
      const farms = farmExists
        ? state.farms.map((item) => (item.id === farm.id ? farm : item))
        : [...state.farms, farm].sort((first, second) =>
            first.name.localeCompare(second.name, 'pt-BR'),
          );
      const selectedFarm =
        state.selectedFarm?.id === farm.id
          ? farm.status === 'ACTIVE'
            ? farm
            : farms.find((item) => item.status === 'ACTIVE' && item.id !== farm.id) ?? null
          : state.selectedFarm?.status === 'ACTIVE'
            ? state.selectedFarm
            : farm.status === 'ACTIVE'
              ? farm
              : farms.find((item) => item.status === 'ACTIVE') ?? null;

      return {
        ...state,
        farms,
        selectedFarm,
        loaded: true,
        error: null,
      };
    });
  }

  selectFarm(farm: Farm | null): void {
    this.state.update((state) => ({
      ...state,
      selectedFarm: farm?.status === 'ACTIVE' ? farm : null,
    }));
  }

  selectFarmById(id: number): void {
    const farm = this.farms().find((item) => item.id === id) ?? null;
    this.selectFarm(farm);
  }

  setLoading(value: boolean): void {
    this.state.update((state) => ({ ...state, loading: value }));
  }

  setError(value: string | null): void {
    this.state.update((state) => ({ ...state, error: value }));
  }

  clear(): void {
    this.state.set({
      farms: [],
      selectedFarm: null,
      loading: false,
      error: null,
      loaded: false,
    });
  }
}
