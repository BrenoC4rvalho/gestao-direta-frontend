import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { MAIN_NAV_ITEMS } from '../layout-navigation';

@Component({
  selector: 'gd-desktop-sidebar',
  imports: [LucideDynamicIcon, RouterLink, RouterLinkActive],
  templateUrl: './desktop-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopSidebar {
  protected readonly navItems = MAIN_NAV_ITEMS;
}
