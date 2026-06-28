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
import { finalize, forkJoin, Observable } from 'rxjs';

import { FinancialCategory } from '../../core/models/financial-category.models';
import {
  CreateFinancialTransactionRequest,
  FinancialTransaction,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  UpdateFinancialTransactionRequest,
} from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Select } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { TransactionCard } from './components/transaction-card/transaction-card';
import { TransactionForm } from './components/transaction-form/transaction-form';

interface TransactionLists {
  transactions: PageResponse<FinancialTransaction>;
  categories: FinancialCategory[];
}

interface TransactionFiltersControls {
  type: GdFormControl;
  status: GdFormControl;
  categoryId: GdFormControl;
}

@Component({
  selector: 'gd-transactions-page',
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    EmptyState,
    ErrorState,
    ReactiveFormsModule,
    Select,
    Skeleton,
    TransactionCard,
    TransactionForm,
  ],
  templateUrl: './transactions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  private readonly transactionService = inject(FinancialTransactionService);
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly transactions = signal<FinancialTransaction[]>([]);
  protected readonly categories = signal<FinancialCategory[]>([]);
  protected readonly page = signal(0);
  protected readonly pageInfo = signal({ totalPages: 0, totalElements: 0, first: true, last: true });
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly editingTransaction = signal<FinancialTransaction | null>(null);
  protected readonly submitting = signal(false);
  protected readonly paidTarget = signal<FinancialTransaction | null>(null);
  protected readonly paidSubmitting = signal(false);
  protected readonly cancelTarget = signal<FinancialTransaction | null>(null);
  protected readonly cancelSubmitting = signal(false);
  protected readonly skeletons = [1, 2, 3, 4, 5, 6];

  private readonly reloadTrigger = signal(0);
  private readonly typeFilter = signal<TransactionType | null>(null);
  private readonly statusFilter = signal<PaymentStatus | null>(null);
  private readonly categoryFilter = signal<number | null>(null);

  protected readonly filterForm = new FormGroup<TransactionFiltersControls>({
    type: new FormControl<GdFormValue>(''),
    status: new FormControl<GdFormValue>(''),
    categoryId: new FormControl<GdFormValue>(''),
  });

  protected readonly selectedFarmName = computed(
    () => this.selectedFarmStore.selectedFarm()?.name ?? null,
  );
  protected readonly drawerTitle = computed(() =>
    this.editingTransaction() ? 'Editar movimentação' : 'Nova movimentação',
  );
  protected readonly drawerDescription = computed(() =>
    this.editingTransaction()
      ? 'Atualize os dados financeiros desta movimentação.'
      : 'Registre uma receita ou despesa da fazenda selecionada.',
  );
  protected readonly canViewTransactions = computed(() => {
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
  protected readonly canManageTransactions = computed(() => {
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
  protected readonly filteredTransactions = computed(() => {
    const type = this.typeFilter();
    const status = this.statusFilter();
    const categoryId = this.categoryFilter();

    return this.transactions().filter((transaction) => {
      const matchesType = !type || transaction.type === type;
      const matchesStatus = !status || transaction.status === status;
      const matchesCategory = categoryId === null || transaction.categoryId === categoryId;

      return matchesType && matchesStatus && matchesCategory;
    });
  });
  protected readonly summary = computed(() => {
    const totals = this.filteredTransactions().reduce(
      (current, transaction) => {
        if (transaction.status === 'CANCELED') {
          return current;
        }

        if (transaction.type === 'INCOME') {
          return { ...current, income: current.income + transaction.amount };
        }

        return { ...current, expense: current.expense + transaction.amount };
      },
      { income: 0, expense: 0 },
    );

    return { ...totals, balance: totals.income - totals.expense };
  });
  protected readonly categoryFilterOptions = computed<readonly GdSelectOption[]>(() =>
    this.categories()
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => ({ label: category.name, value: category.id })),
  );

  protected readonly typeFilterOptions: readonly GdSelectOption[] = [
    { label: 'Receitas', value: 'INCOME' },
    { label: 'Despesas', value: 'EXPENSE' },
  ];
  protected readonly statusFilterOptions: readonly GdSelectOption[] = [
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Paga', value: 'PAID' },
    { label: 'Atrasada', value: 'OVERDUE' },
    { label: 'Cancelada', value: 'CANCELED' },
  ];

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

  constructor() {
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.typeFilter.set(this.nullableString(this.filterForm.controls.type.value) as TransactionType | null);
      this.statusFilter.set(
        this.nullableString(this.filterForm.controls.status.value) as PaymentStatus | null,
      );
      this.categoryFilter.set(this.numberOrNull(this.filterForm.controls.categoryId.value));

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

      if (!isAdmin && !this.canViewTransactions()) {
        this.clearListState();
        this.accessDenied.set(true);
        return;
      }

      this.accessDenied.set(false);
      this.error.set(false);
      this.loading.set(true);

      const subscription = this.buildListRequest(farmId, page)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (lists) => {
            this.transactions.set(lists.transactions.content);
            this.categories.set(lists.categories);
            this.pageInfo.set({
              totalPages: lists.transactions.totalPages,
              totalElements: lists.transactions.totalElements,
              first: lists.transactions.first,
              last: lists.transactions.last,
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
    this.filterForm.reset({ type: '', status: '', categoryId: '' });
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

  protected openCreateDrawer(): void {
    if (!this.canCreateTransaction()) {
      this.showPermissionError();
      return;
    }

    this.editingTransaction.set(null);
    this.drawerOpen.set(true);
  }

  protected openEditDrawer(transaction: FinancialTransaction): void {
    if (!this.canEditTransaction(transaction)) {
      this.showPermissionError();
      return;
    }

    this.editingTransaction.set(transaction);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.submitting()) {
      return;
    }

    this.resetDrawerState();
  }

  protected saveTransaction(payload: UpdateFinancialTransactionRequest): void {
    const editingTransaction = this.editingTransaction();

    if (editingTransaction) {
      this.updateTransaction(editingTransaction, payload);
      return;
    }

    this.createTransaction(payload);
  }

  protected requestMarkAsPaid(transaction: FinancialTransaction): void {
    if (!this.canMarkAsPaid(transaction)) {
      this.showPermissionError();
      return;
    }

    this.paidTarget.set(transaction);
  }

  protected closePaidConfirmation(): void {
    if (!this.paidSubmitting()) {
      this.paidTarget.set(null);
    }
  }

  protected confirmMarkAsPaid(): void {
    const transaction = this.paidTarget();

    if (!transaction || this.paidSubmitting()) {
      return;
    }

    if (!this.canMarkAsPaid(transaction)) {
      this.showPermissionError();
      return;
    }

    this.paidSubmitting.set(true);

    this.transactionService
      .markAsPaid(transaction.id, {
        paymentMethod: transaction.paymentMethod,
      })
      .pipe(
        finalize(() => this.paidSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.paidTarget.set(null);
          this.toastStore.success('Movimentação marcada como paga.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected requestCancel(transaction: FinancialTransaction): void {
    if (!this.canCancelTransaction(transaction)) {
      this.showPermissionError();
      return;
    }

    this.cancelTarget.set(transaction);
  }

  protected closeCancelConfirmation(): void {
    if (!this.cancelSubmitting()) {
      this.cancelTarget.set(null);
    }
  }

  protected confirmCancel(): void {
    const transaction = this.cancelTarget();

    if (!transaction || this.cancelSubmitting()) {
      return;
    }

    if (!this.canCancelTransaction(transaction)) {
      this.showPermissionError();
      return;
    }

    this.cancelSubmitting.set(true);

    this.transactionService
      .cancel(transaction.id)
      .pipe(
        finalize(() => this.cancelSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelTarget.set(null);
          this.toastStore.success('Movimentação cancelada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  protected canCreateTransaction(): boolean {
    return this.selectedFarmStore.selectedFarmId() !== null && this.canManageTransactions();
  }

  protected canEditTransaction(transaction: FinancialTransaction): boolean {
    return this.canManageTransactions() && transaction.status !== 'CANCELED';
  }

  protected canMarkAsPaid(transaction: FinancialTransaction): boolean {
    return (
      this.canManageTransactions() &&
      transaction.status !== 'PAID' &&
      transaction.status !== 'CANCELED'
    );
  }

  protected canCancelTransaction(transaction: FinancialTransaction): boolean {
    return this.canManageTransactions() && transaction.status !== 'CANCELED';
  }

  protected formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  protected formatDate(value: string | null): string {
    return value ? this.dateFormatter.format(new Date(value)) : 'Não informada';
  }

  protected typeLabel(type: TransactionType): string {
    const labels: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
    };

    return labels[type] ?? type;
  }

  protected typeVariant(type: TransactionType): BadgeVariant {
    return type === 'INCOME' ? 'success' : 'danger';
  }

  protected statusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Paga',
      OVERDUE: 'Atrasada',
      CANCELED: 'Cancelada',
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

  protected paymentMethodLabel(method: PaymentMethod | null): string {
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

  protected amountClasses(type: TransactionType): string {
    return type === 'INCOME' ? 'text-success' : 'text-danger';
  }

  protected amountPrefix(type: TransactionType): string {
    return type === 'INCOME' ? '+' : '-';
  }

  private createTransaction(payload: UpdateFinancialTransactionRequest): void {
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!farmId || this.submitting() || !this.canCreateTransaction()) {
      this.showPermissionError();
      return;
    }

    const request: CreateFinancialTransactionRequest = {
      ...payload,
      farmId,
    };

    this.submitting.set(true);

    this.transactionService
      .create(request)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetDrawerState();
          this.toastStore.success('Movimentação criada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  private updateTransaction(
    transaction: FinancialTransaction,
    payload: UpdateFinancialTransactionRequest,
  ): void {
    if (this.submitting() || !this.canEditTransaction(transaction)) {
      this.showPermissionError();
      return;
    }

    this.submitting.set(true);

    this.transactionService
      .update(transaction.id, payload)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetDrawerState();
          this.toastStore.success('Movimentação atualizada com sucesso.');
          this.retry();
        },
        error: (error: unknown) => this.showOperationError(error),
      });
  }

  private buildListRequest(farmId: number, page: number): Observable<TransactionLists> {
    return forkJoin({
      transactions: this.transactionService.listByFarm({
        farmId,
        page,
        size: 10,
        sort: 'transactionDate',
        direction: 'DESC',
        type: this.typeFilter(),
        status: this.statusFilter(),
        categoryId: this.categoryFilter(),
      }),
      categories: this.categoryService.listByFarm(farmId),
    });
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private handleListError(error: unknown): void {
    this.transactions.set([]);
    this.categories.set([]);

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
      400: 'Verifique os dados da movimentação.',
      401: 'Sua sessão expirou. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Movimentação não encontrada.',
    };

    this.toastStore.error(messages[error.status] ?? 'Não foi possível concluir a operação.');
  }

  private showPermissionError(): void {
    this.toastStore.error('Você não tem permissão para realizar esta ação.');
  }

  private resetDrawerState(): void {
    this.drawerOpen.set(false);
    this.editingTransaction.set(null);
  }

  private clearListState(): void {
    this.transactions.set([]);
    this.categories.set([]);
    this.pageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }

  private nullableString(value: GdFormValue): string | null {
    const text = `${value ?? ''}`.trim();
    return text || null;
  }

  private numberOrNull(value: GdFormValue): number | null {
    if (value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
