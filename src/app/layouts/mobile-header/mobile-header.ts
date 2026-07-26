import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { PendingFinancialTransactionCountService } from '../../core/services/pending-financial-transaction-count.service';
import { Drawer } from '../../shared/overlays';
import { ThemeToggleButton } from '../../shared/ui';
import { getVisibleNavItems, MAIN_NAV_ITEMS } from '../layout-navigation';

@Component({
  selector: 'gd-mobile-header',
  imports: [
    Drawer,
    LucideDynamicIcon,
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    ThemeToggleButton,
  ],
  templateUrl: './mobile-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileHeader {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastStore = inject(ToastStore);

  protected readonly sessionStore = inject(SessionStore);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly pendingCount = inject(PendingFinancialTransactionCountService);
  protected readonly navItems = computed(() =>
    getVisibleNavItems(MAIN_NAV_ITEMS, {
      userType: this.sessionStore.userType(),
      role: this.farmAccessStore.role(),
      permissions: this.farmAccessStore.access()?.permissions ?? null,
      hasSelectedFarm: this.selectedFarmStore.selectedFarmId() !== null,
    }),
  );
  protected readonly isMenuOpen = signal(false);

  protected openMenu(): void {
    this.isMenuOpen.set(true);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();

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
