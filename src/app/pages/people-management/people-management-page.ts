import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';

@Component({
  selector: 'gd-people-management-page',
  imports: [LucideDynamicIcon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './people-management-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleManagementPage {
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
}
