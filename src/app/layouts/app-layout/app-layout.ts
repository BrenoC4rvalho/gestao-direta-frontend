import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

import { FarmAccessService } from '../../core/services/farm-access.service';
import { FarmService } from '../../core/services/farm.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { ToastStore } from '../../core/stores/toast.store';
import { DesktopSidebar } from '../desktop-sidebar/desktop-sidebar';
import { FarmContextSelector } from '../farm-context-selector/farm-context-selector';
import { MobileHeader } from '../mobile-header/mobile-header';

@Component({
  selector: 'gd-app-layout',
  imports: [DesktopSidebar, FarmContextSelector, MobileHeader, RouterOutlet],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout implements OnInit {
  private readonly farmAccessService = inject(FarmAccessService);
  private readonly farmService = inject(FarmService);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly toastStore = inject(ToastStore);

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();

      if (!farmId) {
        this.farmAccessStore.clear();
        return;
      }

      this.farmAccessStore.setAccess(null);
      this.farmAccessStore.setError(null);
      this.farmAccessStore.setLoading(true);

      const subscription = this.farmAccessService
        .getAccess(farmId)
        .pipe(finalize(() => this.farmAccessStore.setLoading(false)))
        .subscribe({
          next: (access) => this.farmAccessStore.setAccess(access),
          error: (error: unknown) => this.handleAccessError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  ngOnInit(): void {
    if (this.selectedFarmStore.loaded() || this.selectedFarmStore.loading()) {
      return;
    }

    this.selectedFarmStore.setLoading(true);

    this.farmService
      .list({ page: 0, size: 100, sort: 'name', direction: 'ASC' })
      .pipe(finalize(() => this.selectedFarmStore.setLoading(false)))
      .subscribe({
        next: (response) => this.selectedFarmStore.setFarms(response.content),
        error: () => {
          this.selectedFarmStore.setError('Não foi possível carregar suas fazendas.');
          this.toastStore.info('Não foi possível carregar suas fazendas.');
        },
      });
  }

  private handleAccessError(error: unknown): void {
    this.farmAccessStore.setAccess(null);

    const message =
      error instanceof HttpErrorResponse && error.status === 403
        ? 'Você não tem acesso a esta fazenda.'
        : error instanceof HttpErrorResponse && error.status === 404
          ? 'Fazenda não encontrada.'
          : 'Não foi possível carregar suas permissões.';

    this.farmAccessStore.setError(message);
    this.toastStore.info(message);
  }
}
