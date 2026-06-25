import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Farm } from '../../core/models/farm.models';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';

@Component({
  selector: 'gd-farm-context-selector',
  imports: [LucideDynamicIcon],
  templateUrl: './farm-context-selector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmContextSelector {
  readonly selectId = input.required<string>();

  protected readonly selectedFarmStore = inject(SelectedFarmStore);

  protected readonly options = computed<readonly Farm[]>(() => {
    const farms = this.selectedFarmStore.farms().filter((farm) => farm.status === 'ACTIVE');
    const selectedFarm = this.selectedFarmStore.selectedFarm();

    if (!selectedFarm || farms.some((farm) => farm.id === selectedFarm.id)) {
      return farms;
    }

    return [selectedFarm, ...farms];
  });

  protected selectFarm(event: Event): void {
    const farmId = Number((event.target as HTMLSelectElement).value);
    const farm = this.options().find((item) => item.id === farmId);

    if (farm) {
      this.selectedFarmStore.selectFarm(farm);
    }
  }
}
