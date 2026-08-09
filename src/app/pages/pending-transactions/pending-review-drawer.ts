import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { finalize, forkJoin, of, switchMap } from 'rxjs';

import { FinancialCategory } from '../../core/models/financial-category.models';
import {
  FinancialTransactionDraft,
  PaymentStatus,
  UpdateFinancialTransactionRequest,
} from '../../core/models/financial-transaction.models';
import { HarvestSeason } from '../../core/models/harvest-season.models';
import {
  ApprovePendingFinancialTransactionRequest,
  PendingFinancialTransaction,
} from '../../core/models/pending-financial-transaction.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { PendingFinancialTransactionService } from '../../core/services/pending-financial-transaction.service';
import { ToastStore } from '../../core/stores/toast.store';
import { Textarea } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { Badge, Button, ErrorState, Skeleton } from '../../shared/ui';
import { TransactionForm } from '../transactions/components/transaction-form/transaction-form';

@Component({
  selector: 'gd-pending-review-drawer',
  imports: [
    Badge,
    DatePipe,
    Button,
    ConfirmDialog,
    Drawer,
    ErrorState,
    Skeleton,
    Textarea,
    TransactionForm,
  ],
  templateUrl: './pending-review-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingReviewDrawer {
  private readonly service = inject(PendingFinancialTransactionService);
  private readonly categoriesService = inject(FinancialCategoryService);
  private readonly harvestSeasonService = inject(HarvestSeasonService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastStore);

  readonly open = input(false);
  readonly pendingId = input<number | null>(null);
  readonly refreshed = output<PendingFinancialTransaction>();
  readonly decided = output<void>();
  readonly closed = output<void>();

  protected readonly detail = signal<PendingFinancialTransaction | null>(null);
  protected readonly categories = signal<readonly FinancialCategory[]>([]);
  protected readonly harvestSeasons = signal<readonly HarvestSeason[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly approving = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly approveConfirm = signal(false);
  protected readonly rejectionMode = signal(false);
  protected readonly approvalRequest = signal<ApprovePendingFinancialTransactionRequest | null>(
    null,
  );
  protected readonly rejectionReason = new FormControl('');
  protected readonly approvalStatuses: readonly PaymentStatus[] = ['PENDING', 'PAID'];
  protected readonly reviewDraft = computed<FinancialTransactionDraft | null>(() => {
    const item = this.detail();

    if (!item) {
      return null;
    }

    return {
      description: item.description,
      amount: item.amount,
      type: item.type,
      status: 'PAID',
      paymentMethod: item.paymentMethod ?? null,
      transactionDate: item.transactionDate,
      dueDate: null,
      paidAt: item.transactionDate,
      notes: item.notes ?? null,
      categoryId: item.categoryId,
      harvestSeasonId: item.harvestSeasonId ?? null,
    };
  });

  constructor() {
    effect(() => {
      const id = this.pendingId();

      if (this.open() && id !== null) {
        untracked(() => this.load(id));
      }
    });
  }

  protected retry(): void {
    const id = this.pendingId();

    if (id !== null) {
      this.load(id);
    }
  }

  protected requestClose(): void {
    if (!this.approving() && !this.rejecting()) {
      this.closed.emit();
    }
  }

  protected submitReview(): void {
    document.querySelector<HTMLFormElement>('gd-pending-review-drawer form')?.requestSubmit();
  }

  protected requestApproval(value: UpdateFinancialTransactionRequest): void {
    if (this.rejecting() || (value.status !== 'PAID' && value.status !== 'PENDING')) {
      return;
    }

    this.approvalRequest.set({
      ...value,
      status: value.status,
    });
    this.approveConfirm.set(true);
  }

  protected approve(): void {
    const item = this.detail();
    const request = this.approvalRequest();

    if (!item || !request) {
      return;
    }

    this.approving.set(true);
    this.service
      .approve(item.id, request)
      .pipe(finalize(() => this.approving.set(false)))
      .subscribe({
        next: () => {
          this.approveConfirm.set(false);
          this.toast.success('Movimentação aprovada com sucesso.');
          this.decided.emit();
        },
        error: (response: { status?: number }) => this.handleDecisionError(response.status),
      });
  }

  protected reject(): void {
    const item = this.detail();

    if (!item || !this.rejectionMode() || this.rejecting()) {
      return;
    }

    this.rejecting.set(true);
    this.service
      .reject(item.id, this.rejectionReason.value?.trim() || undefined)
      .pipe(finalize(() => this.rejecting.set(false)))
      .subscribe({
        next: () => {
          this.rejectionMode.set(false);
          this.toast.success('Movimentação rejeitada com sucesso.');
          this.decided.emit();
        },
        error: (response: { status?: number }) => this.handleDecisionError(response.status),
      });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.approvalRequest.set(null);
    this.rejectionMode.set(false);
    this.rejectionReason.reset('');

    this.service
      .getById(id)
      .pipe(
        switchMap((detail) =>
          forkJoin({
            detail: of(detail),
            categories: this.categoriesService.listByFarm(detail.farmId, {
              includeInactive: false,
              size: 100,
            }),
            harvests: this.harvestSeasonService.list({
              farmId: detail.farmId,
              includeInactive: false,
              size: 100,
            }),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ detail, categories, harvests }) => {
          this.detail.set(detail);
          this.categories.set(categories);
          this.harvestSeasons.set(harvests.content);
        },
        error: () => this.error.set(true),
      });
  }

  private handleDecisionError(status: number | undefined): void {
    if (status === 409) {
      this.toast.error('Esta pendência já foi processada.');
    } else if (status === 403) {
      this.toast.error('Você não tem permissão para concluir esta ação.');
    } else if (status === 404) {
      this.closed.emit();
    } else {
      this.toast.error('Não foi possível concluir a decisão.');
    }
  }
}
