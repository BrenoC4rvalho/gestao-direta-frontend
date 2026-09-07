import { computed, Injectable, signal } from '@angular/core';

import { BadgeVariant } from '../../shared/ui';

export interface HarvestPageHeader {
  title: string;
  statusLabel: string;
  statusVariant: BadgeVariant;
  metadata: string;
}

export type HarvestPageHeaderState =
  | { state: 'loading' }
  | { state: 'ready'; header: HarvestPageHeader }
  | { state: 'hidden' };

@Injectable({ providedIn: 'root' })
export class PageHeaderStore {
  private readonly harvestHeaderState = signal<HarvestPageHeaderState>({ state: 'hidden' });

  readonly harvestHeader = computed(() => this.harvestHeaderState());

  setHarvestLoading(): void {
    this.harvestHeaderState.set({ state: 'loading' });
  }

  setHarvestHeader(header: HarvestPageHeader): void {
    this.harvestHeaderState.set({ state: 'ready', header });
  }

  hideHarvestHeader(): void {
    this.harvestHeaderState.set({ state: 'hidden' });
  }
}
