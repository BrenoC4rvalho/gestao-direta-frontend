import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { Drawer } from '../../shared/overlays';
import { MAIN_NAV_ITEMS } from '../layout-navigation';

@Component({
  selector: 'gd-mobile-header',
  imports: [Drawer, LucideDynamicIcon, RouterLink, RouterLinkActive],
  templateUrl: './mobile-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileHeader {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastStore = inject(ToastStore);

  protected readonly sessionStore = inject(SessionStore);
  protected readonly navItems = MAIN_NAV_ITEMS;
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
          void this.router.navigate(['/login']);
        }),
      )
      .subscribe({
        next: () => this.toastStore.success('Sessão encerrada.'),
        error: () => this.toastStore.info('Sessão local encerrada.'),
      });
  }
}
