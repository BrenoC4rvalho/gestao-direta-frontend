import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  PaymentMethod,
  PaymentStatus,
  UpcomingBill,
} from '../../core/models/financial.models';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { UpcomingBillService } from '../../core/services/upcoming-bill.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Select } from '../../shared/forms';
import { ConfirmDialog } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { UpcomingBillCard } from './components/upcoming-bill-card/upcoming-bill-card';

type PeriodFilter = 'OVERDUE' | 'NEXT_7_DAYS' | 'NEXT_30_DAYS';

interface UpcomingBillFiltersControls {
  status: GdFormControl;
  period: GdFormControl;
}

interface UpcomingBillSummaryItem {
  count: number;
  total: number;
}

interface UpcomingBillSummary {
  pendingTotal: number;
  overdue: UpcomingBillSummaryItem;
  soon: UpcomingBillSummaryItem;
}

@Component({
  selector: 'gd-upcoming-bills-page',
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    ReactiveFormsModule,
    Select,
    Skeleton,
    UpcomingBillCard,
  ],
  templateUrl: './upcoming-bills-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingBillsPage {
  private readonly upcomingBillService = inject(UpcomingBillService);
  private readonly transactionService = inject(FinancialTransactionService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly bills = signal<UpcomingBill[]>([]);
  protected readonly page = signal(0);
  protected readonly pageInfo = signal({ totalPages: 0, totalElements: 0, first: true, last: true });
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly paidTarget = signal<UpcomingBill | null>(null);
  protected readonly paidSubmitting = signal(false);
  protected readonly cancelTarget = signal<UpcomingBill | null>(null);
  protected readonly cancelSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  private readonly reloadTrigger = signal(0);
  private readonly statusFilter = signal<PaymentStatus | null>(null);
  private readonly periodFilter = signal<PeriodFilter | null>(null);
  private readonly today = this.startOfLocalDay(new Date());

  protected readonly filterForm = new FormGroup<UpcomingBillFiltersControls>({
    status: new FormControl<GdFormValue>(''),
    period: new FormControl<GdFormValue>(''),
  });

  protected readonly selectedFarmName = computed(
    () => this.selectedFarmStore.selectedFarm()?.name ?? null,
  );
  protected readonly canViewUpcomingBills = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canViewFinancial()
    );
  });
  protected readonly canManageUpcomingBills = computed(() => {
    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();

    return (
      !!farmId &&
      this.farmAccessStore.access()?.farmId === farmId &&
      this.farmAccessStore.canManageTransactions()
    );
  });
  protected readonly filteredBills = computed(() => {
    const status = this.statusFilter();
    const period = this.periodFilter();

    return this.bills().filter((bill) => {
      const matchesStatus = !status || bill.status === status;
      const matchesPeriod = !period || this.matchesPeriod(bill, period);

      return matchesStatus && matchesPeriod;
    });
  });
  protected readonly summary = computed<UpcomingBillSummary>(() =>
    this.filteredBills().reduce(
      (current, bill) => {
        const isPending = bill.status === 'PENDING' || this.isOverdue(bill);
        const isOverdue = this.isOverdue(bill);
        const daysUntilDue = this.daysUntilDue(bill);
        const isSoon = bill.status === 'PENDING' && daysUntilDue >= 0 && daysUntilDue <= 7;

        return {
          pendingTotal: isPending ? current.pendingTotal + bill.amount : current.pendingTotal,
          overdue: isOverdue
            ? { count: current.overdue.count + 1, total: current.overdue.total + bill.amount }
            : current.overdue,
          soon: isSoon
            ? { count: current.soon.count + 1, total: current.soon.total + bill.amount }
            : current.soon,
        };
      },
      {
        pendingTotal: 0,
        overdue: { count: 0, total: 0 },
        soon: { count: 0, total: 0 },
      },
    ),
  );

  protected readonly statusFilterOptions: readonly GdSelectOption[] = [
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Vencido', value: 'OVERDUE' },
    { label: 'Pago', value: 'PAID' },
    { label: 'Cancelado', value: 'CANCELED' },
  ];
  protected readonly periodFilterOptions: readonly GdSelectOption[] = [
    { label: 'Vencidas', value: 'OVERDUE' },
    { label: 'Próximos 7 dias', value: 'NEXT_7_DAYS' },
    { label: 'Próximos 30 dias', value: 'NEXT_30_DAYS' },
  ];

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  constructor() {
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.statusFilter.set(
        this.nullableString(this.filterForm.controls.status.value) as PaymentStatus | null,
      );
      this.periodFilter.set(
        this.nullableString(this.filterForm.controls.period.value) as PeriodFilter | null,
      );

      if (this.page() !== 0) {
        this.page.set(0);
      }
    });

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      const page = this.page();
      this.reloadTrigger();

      if (!farmId) {
        this.clearListState();
        return;
      }

      if (!isAdmin && this.isAccessPending()) {
        this.clearListState();
        return;
      }

      if (!isAdmin && !this.canViewUpcomingBills()) {
        this.clearListState();
        this.accessDenied.set(true);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.upcomingBillService
        .listByFarm(farmId, {
          page,
          size: 10,
          sort: 'dueDate',
          direction: 'ASC',
        })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response) => {
            this.bills.set(response.content);
            this.pageInfo.set({
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              first: response.first,
              last: response.last,
            });
          },
          error: (error: unknown) => this.handleListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
  }

  protected resetFilters(): void {
    this.filterForm.reset({ status: '', period: '' });
  }

  protected previousPage(): void {
    if (!this.pageInfo().first) {
      this.page.update((value) => Math.max(value - 1, 0));
    }
  }

  protected nextPage(): void {
    if (!this.pageInfo().last) {
      this.page.update((value) => value + 1);
    }
  }

  protected requestMarkAsPaid(bill: UpcomingBill): void {
    if (!this.canMarkAsPaid(bill)) {
      this.showPermissionError();
      return;
    }

    this.paidTarget.set(bill);
  }

  protected closePaidConfirmation(): void {
    if (!this.paidSubmitting()) {
      this.paidTarget.set(null);
    }
  }

  protected confirmMarkAsPaid(): void {
    const bill = this.paidTarget();

    if (!bill || this.paidSubmitting()) {
      return;
    }

    if (!this.canMarkAsPaid(bill)) {
      this.showPermissionError();
      return;
    }

    this.paidSubmitting.set(true);

    this.transactionService
      .markAsPaid(bill.id, { paymentMethod: bill.paymentMethod ?? null })
      .pipe(
        finalize(() => this.paidSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.paidTarget.set(null);
          this.toastStore.success('Conta marcada como paga.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestCancel(bill: UpcomingBill): void {
    if (!this.canCancelBill(bill)) {
      this.showPermissionError();
      return;
    }

    this.cancelTarget.set(bill);
  }

  protected closeCancelConfirmation(): void {
    if (!this.cancelSubmitting()) {
      this.cancelTarget.set(null);
    }
  }

  protected confirmCancel(): void {
    const bill = this.cancelTarget();

    if (!bill || this.cancelSubmitting()) {
      return;
    }

    if (!this.canCancelBill(bill)) {
      this.showPermissionError();
      return;
    }

    this.cancelSubmitting.set(true);

    this.transactionService
      .cancel(bill.id)
      .pipe(
        finalize(() => this.cancelSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelTarget.set(null);
          this.toastStore.success('Conta cancelada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected canMarkAsPaid(bill: UpcomingBill): boolean {
    return this.canManageUpcomingBills() && bill.status !== 'PAID' && bill.status !== 'CANCELED';
  }

  protected canCancelBill(bill: UpcomingBill): boolean {
    return this.canManageUpcomingBills() && bill.status !== 'CANCELED';
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected formatDate(value: string | null | undefined): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informada';
  }

  protected statusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      OVERDUE: 'Vencido',
      CANCELED: 'Cancelado',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(status: PaymentStatus): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      PENDING: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELED: 'neutral',
    };

    return variants[status] ?? 'neutral';
  }

  protected paymentMethodLabel(method: PaymentMethod | null | undefined): string {
    if (!method) {
      return 'Não informado';
    }

    const labels: Record<string, string> = {
      PIX: 'Pix',
      CASH: 'Dinheiro',
      CREDIT_CARD: 'Cartão de crédito',
      DEBIT_CARD: 'Cartão de débito',
      BANK_TRANSFER: 'Transferência bancária',
      BOLETO: 'Boleto',
      CHECK: 'Cheque',
      OTHER: 'Outro',
    };

    return labels[method] ?? method;
  }

  protected dueText(bill: UpcomingBill): string {
    const days = this.daysUntilDue(bill);

    if (this.isOverdue(bill)) {
      const overdueDays = Math.abs(days);
      return overdueDays === 1 ? 'Vencida há 1 dia' : `Vencida há ${overdueDays} dias`;
    }

    if (days === 0) {
      return 'Vence hoje';
    }

    return days === 1 ? 'Vence em 1 dia' : `Vence em ${days} dias`;
  }

  protected dueVariant(bill: UpcomingBill): BadgeVariant {
    if (this.isOverdue(bill)) {
      return 'danger';
    }

    const days = this.daysUntilDue(bill);

    if (days <= 7) {
      return 'warning';
    }

    return 'neutral';
  }

  protected isOverdue(bill: UpcomingBill): boolean {
    return bill.status === 'OVERDUE' || (bill.status === 'PENDING' && this.daysUntilDue(bill) < 0);
  }

  protected daysUntilDue(bill: UpcomingBill): number {
    const dueDate = this.parseLocalDate(bill.dueDate);
    const diff = dueDate.getTime() - this.today.getTime();

    return Math.round(diff / 86_400_000);
  }

  private matchesPeriod(bill: UpcomingBill, period: PeriodFilter): boolean {
    const daysUntilDue = this.daysUntilDue(bill);

    if (period === 'OVERDUE') {
      return this.isOverdue(bill);
    }

    if (period === 'NEXT_7_DAYS') {
      return bill.status === 'PENDING' && daysUntilDue >= 0 && daysUntilDue <= 7;
    }

    return bill.status === 'PENDING' && daysUntilDue >= 0 && daysUntilDue <= 30;
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private handleListError(error: unknown): void {
    this.bills.set([]);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private showOperationError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastStore.error('Não foi possível concluir a operação.');
      return;
    }

    const messages: Record<number, string> = {
      400: 'Verifique os dados da conta.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Conta não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private showPermissionError(): void {
    this.toastStore.error('Você não tem permissão para realizar esta ação.');
  }

  private clearListState(): void {
    this.bills.set([]);
    this.pageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }

  private nullableString(value: GdFormValue): string | null {
    const text = `${value ?? ''}`.trim();
    return text || null;
  }

  private parseLocalDate(value: string): Date {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);

    return new Date(year, month - 1, day);
  }

  private startOfLocalDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
}
