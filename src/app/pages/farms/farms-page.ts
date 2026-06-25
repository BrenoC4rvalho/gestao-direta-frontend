import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { Farm } from '../../core/models/farm.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FarmService } from '../../core/services/farm.service';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { ToastStore } from '../../core/stores/toast.store';
import { Button, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { FarmCard } from './components/farm-card/farm-card';

@Component({
  selector: 'gd-farms-page',
  imports: [Button, EmptyState, ErrorState, FarmCard, Skeleton],
  templateUrl: './farms-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmsPage implements OnInit {
  private readonly farmService = inject(FarmService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly response = signal<PageResponse<Farm> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  protected readonly farms = computed(() => this.response()?.content ?? []);
  protected readonly currentPage = computed(() => this.response()?.page ?? 0);

  ngOnInit(): void {
    this.loadPage(0);
  }

  protected retry(): void {
    this.loadPage(this.currentPage());
  }

  protected previousPage(): void {
    const response = this.response();

    if (response && !response.first) {
      this.loadPage(response.page - 1);
    }
  }

  protected nextPage(): void {
    const response = this.response();

    if (response && !response.last) {
      this.loadPage(response.page + 1);
    }
  }

  protected selectFarm(farm: Farm): void {
    this.selectedFarmStore.selectFarm(farm);
    this.toastStore.success('Fazenda selecionada.');
  }

  private loadPage(page: number): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.farmService
      .list({ page, size: 10, sort: 'name', direction: 'ASC' })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.response.set(response),
        error: () => {
          this.response.set(null);
          this.error.set(true);
        },
      });
  }
}
