import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';

@Component({
  selector: 'gd-people-management-page',
  imports: [RouterOutlet],
  templateUrl: './people-management-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleManagementPage {
}
