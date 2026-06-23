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
      const selectedFarm = farms.find((farm) => farm.id === state.selectedFarm?.id) ?? farms[0] ?? null;

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
    this.state.update((state) => ({ ...state, selectedFarm: farm }));
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
