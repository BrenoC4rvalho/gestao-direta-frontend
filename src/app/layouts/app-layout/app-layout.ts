import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

import { FarmService } from '../../core/services/farm.service';
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
  private readonly farmService = inject(FarmService);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly toastStore = inject(ToastStore);

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
}
