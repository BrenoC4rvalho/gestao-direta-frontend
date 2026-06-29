import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { getVisibleNavItems, MAIN_NAV_ITEMS } from '../layout-navigation';

@Component({
  selector: 'gd-desktop-sidebar',
  imports: [LucideDynamicIcon, NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './desktop-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopSidebar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastStore = inject(ToastStore);

  protected readonly sessionStore = inject(SessionStore);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly navItems = computed(() =>
    getVisibleNavItems(MAIN_NAV_ITEMS, {
      userType: this.sessionStore.userType(),
      role: this.farmAccessStore.role(),
      permissions: this.farmAccessStore.access()?.permissions ?? null,
      hasSelectedFarm: this.selectedFarmStore.selectedFarmId() !== null,
    }),
  );

  protected logout(): void {
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.sessionStore.clear();
          this.selectedFarmStore.clear();
          this.farmAccessStore.clear();
          void this.router.navigate(['/login']);
        }),
      )
      .subscribe({
        next: () => this.toastStore.success('Sessão encerrada.'),
        error: () => this.toastStore.info('Sessão local encerrada.'),
      });
  }
}
