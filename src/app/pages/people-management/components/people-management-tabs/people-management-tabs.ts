import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { FarmAccessStore } from '../../../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../../../core/stores/selected-farm.store';
import { SessionStore } from '../../../../core/stores/session.store';
import { Button } from '../../../../shared/ui';

@Component({
  selector: 'gd-people-management-tabs',
  imports: [Button, LucideDynamicIcon, RouterLink, RouterLinkActive],
  templateUrl: './people-management-tabs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleManagementTabs {
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();

  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly sessionStore = inject(SessionStore);

  protected readonly canManageFarmUsers = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      farmId !== null &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canManageFarmUsers()
    );
  });
  protected readonly showUsersTab = computed(
    () => this.sessionStore.isAdmin() || this.canManageFarmUsers(),
  );
  protected readonly showFarmUsersTab = computed(
    () => this.sessionStore.isAdmin() || this.canManageFarmUsers(),
  );

  protected emitAction(): void {
    this.action.emit();
  }
}
