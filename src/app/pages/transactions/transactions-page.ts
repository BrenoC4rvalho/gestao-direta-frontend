import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';

import { HarvestSeason } from '../../core/models/harvest-season.models';
import { FinancialCategory } from '../../core/models/financial-category.models';
import {
  CreateFinancialTransactionRequest,
  FinancialRecordStatus,
  FinancialReportBasis,
  FinancialTransaction,
  FinancialTransactionExportParams,
  FinancialTransactionListParams,
  MonthlyFinancialSummary,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  UpdateFinancialTransactionRequest,
} from '../../core/models/financial-transaction.models';
import { PageResponse } from '../../core/models/page-response.model';
import { UserOption } from '../../core/models/user.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FinancialTransactionService } from '../../core/services/financial-transaction.service';
import { FarmUserService } from '../../core/services/farm-user.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, GdSelectOption, Input, Select } from '../../shared/forms';
import { ConfirmDialog } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { brazilianMoneyToNumber, sanitizeBrazilianMoneyInput } from '../../shared/utils/money.utils';
import { Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { TransactionFormDrawer } from './components/transaction-form-drawer/transaction-form-drawer';
import { TransactionList, TransactionListPageInfo } from './components/transaction-list/transaction-list';

interface TransactionLists {
  transactions: PageResponse<FinancialTransaction>;
  filterCategories: FinancialCategory[];
  formCategories: FinancialCategory[];
}

type TransactionView = 'transactions' | 'monthly';
type MonthlyFinancialView = FinancialReportBasis;

interface TransactionFiltersControls {
  transactionDateStart: GdFormControl;
  transactionDateEnd: GdFormControl;
  paidAtStart: GdFormControl;
  paidAtEnd: GdFormControl;
  type: GdFormControl;
  categoryId: GdFormControl;
  paymentStatus: GdFormControl;
  paymentMethod: GdFormControl;
  recordStatus: GdFormControl;
  description: GdFormControl;
  createdByUserId: GdFormControl;
  harvestSeasonId: GdFormControl;
  minAmount: GdFormControl;
  maxAmount: GdFormControl;
}

type AppliedTransactionFilters = Pick<
  FinancialTransactionListParams,
  | 'transactionDateStart'
  | 'transactionDateEnd'
  | 'paidAtStart'
  | 'paidAtEnd'
  | 'type'
  | 'categoryIds'
  | 'paymentStatuses'
  | 'paymentMethods'
  | 'recordStatus'
  | 'description'
  | 'createdByUserId'
  | 'harvestSeasonId'
  | 'minAmount'
  | 'maxAmount'
>;

interface ChipOption<T extends string | number> {
  label: string;
  value: T | null;
}

const EMPTY_FILTER_FORM_VALUE = {
  transactionDateStart: '',
  transactionDateEnd: '',
  paidAtStart: '',
  paidAtEnd: '',
  type: '',
  categoryId: '',
  paymentStatus: '',
  paymentMethod: '',
  recordStatus: '',
  description: '',
  createdByUserId: '',
  harvestSeasonId: '',
  minAmount: '',
  maxAmount: '',
};

const INITIAL_MONTHLY_PERIOD = new Date();

@Component({
  selector: 'gd-transactions-page',
  imports: [
    Button,
    BrCurrencyPipe,
    Card,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    Select,
    Skeleton,
    TransactionFormDrawer,
    TransactionList,
  ],
  templateUrl: './transactions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  private readonly transactionService = inject(FinancialTransactionService);
  private readonly categoryService = inject(FinancialCategoryService);
  private readonly harvestSeasonService = inject(HarvestSeasonService);
  private readonly farmUserService = inject(FarmUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastStore = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly transactions = signal<FinancialTransaction[]>([]);
  protected readonly filterCategories = signal<FinancialCategory[]>([]);
  protected readonly formCategories = signal<FinancialCategory[]>([]);
  protected readonly harvestSeasons = signal<HarvestSeason[]>([]);
  protected readonly createdByUsers = signal<UserOption[]>([]);
  protected readonly createdByUsersLoading = signal(false);
  protected readonly page = signal(0);
  protected readonly pageInfo = signal({ totalPages: 0, totalElements: 0, first: true, last: true });
  protected readonly loading = signal(false);
  protected readonly monthlyTransactions = signal<FinancialTransaction[]>([]);
  protected readonly monthlyPage = signal(0);
  protected readonly monthlyPageInfo = signal<TransactionListPageInfo>({
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
  });
  protected readonly monthlyLoading = signal(false);
  protected readonly monthlyError = signal(false);
  protected readonly monthlySummary = signal<MonthlyFinancialSummary | null>(null);
  protected readonly monthlySummaryLoading = signal(false);
  protected readonly monthlySummaryError = signal(false);
  protected readonly exportingExcel = signal(false);
  protected readonly exportingPdf = signal(false);
  protected readonly error = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly editingTransaction = signal<FinancialTransaction | null>(null);
  protected readonly submitting = signal(false);
  protected readonly paidTarget = signal<FinancialTransaction | null>(null);
  protected readonly paidSubmitting = signal(false);
  protected readonly cancelTarget = signal<FinancialTransaction | null>(null);
  protected readonly cancelSubmitting = signal(false);
  protected readonly showAdvancedFilters = signal(false);
  private readonly monthlyControlsButton = viewChild('monthlyControlsButton', {
    read: ElementRef<HTMLElement>,
  });
  private readonly monthlyControlsMenu = viewChild('monthlyControlsMenu', {
    read: ElementRef<HTMLElement>,
  });

  private readonly reloadTrigger = signal(0);
  private readonly monthlyReloadTrigger = signal(0);
  private readonly monthlySummaryReloadTrigger = signal(0);
  protected readonly activeView = signal<TransactionView>('transactions');
  protected readonly monthlyMonth = signal(INITIAL_MONTHLY_PERIOD.getMonth() + 1);
  protected readonly monthlyYear = signal(INITIAL_MONTHLY_PERIOD.getFullYear());
  protected readonly monthlyBasis = signal<MonthlyFinancialView>('ACCRUAL');
  protected readonly monthlyControlsMenuOpen = signal(false);
  private readonly draftTypeFilter = signal<TransactionType | null>(null);
  protected readonly selectedCategoryIds = signal<readonly number[]>([]);
  protected readonly selectedPaymentStatuses = signal<readonly PaymentStatus[]>([]);
  protected readonly selectedPaymentMethods = signal<readonly PaymentMethod[]>([]);
  private readonly appliedFilters = signal<AppliedTransactionFilters>({});
  private readonly initialHarvestSeasonId = this.queryParamNumber(
    this.route.snapshot.queryParamMap.get('harvestSeasonId'),
  );
  private initialHarvestSeasonApplied = false;

  protected readonly filterForm = new FormGroup<TransactionFiltersControls>({
    transactionDateStart: new FormControl<GdFormValue>(''),
    transactionDateEnd: new FormControl<GdFormValue>(''),
    paidAtStart: new FormControl<GdFormValue>(''),
    paidAtEnd: new FormControl<GdFormValue>(''),
    type: new FormControl<GdFormValue>(''),
    categoryId: new FormControl<GdFormValue>(''),
    paymentStatus: new FormControl<GdFormValue>(''),
    paymentMethod: new FormControl<GdFormValue>(''),
    recordStatus: new FormControl<GdFormValue>(''),
    description: new FormControl<GdFormValue>(''),
    createdByUserId: new FormControl<GdFormValue>(''),
    harvestSeasonId: new FormControl<GdFormValue>(''),
    minAmount: new FormControl<GdFormValue>(''),
    maxAmount: new FormControl<GdFormValue>(''),
  });
  protected readonly monthlyForm = new FormGroup({
    month: new FormControl<GdFormValue>(this.monthlyMonth()),
    year: new FormControl<GdFormValue>(this.monthlyYear()),
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
  protected readonly filteredTransactions = computed(() => this.transactions());
  protected readonly canExportTransactions = computed(
    () => this.canViewTransactions() && this.pageInfo().totalElements > 0,
  );
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
  protected readonly categoryChips = computed<readonly ChipOption<number>[]>(() => {
    const allCategories = this.filterCategories();

    if (allCategories.length === 0) {
      return [];
    }

    const type = this.draftTypeFilter();
    const categoryOptions = allCategories
      .filter((category) => !type || category.type === type)
      .map((category) => ({
        label: this.categoryChipLabel(category),
        value: category.id,
      }));

    return [{ label: 'Todas', value: null }, ...categoryOptions];
  });
  protected readonly activeAdvancedFiltersCount = computed(() => {
    const filters = this.appliedFilters();

    return [
      filters.paidAtStart,
      filters.paidAtEnd,
      filters.categoryIds,
      filters.recordStatus,
      filters.createdByUserId,
      filters.harvestSeasonId,
      filters.minAmount,
      filters.maxAmount,
    ].filter((value) => this.hasFilterValue(value)).length;
  });
  protected readonly hasActiveFilters = computed(() => {
    const filters = this.appliedFilters();

    return [
      filters.transactionDateStart,
      filters.transactionDateEnd,
      filters.paidAtStart,
      filters.paidAtEnd,
      filters.type,
      filters.categoryIds,
      filters.paymentStatuses,
      filters.paymentMethods,
      filters.recordStatus,
      filters.description,
      filters.createdByUserId,
      filters.harvestSeasonId,
      filters.minAmount,
      filters.maxAmount,
    ].some((value) => this.hasFilterValue(value));
  });
  protected readonly emptyStateDescription = computed(() =>
    this.hasActiveFilters()
      ? 'Nenhuma movimentação encontrada para os filtros informados.'
      : 'As receitas e despesas da fazenda aparecerão aqui.',
  );
  protected readonly monthlyEmptyStateDescription = computed(() => {
    const month = this.monthLabel(this.monthlyMonth()).toLocaleLowerCase('pt-BR');

    return `Nenhuma movimentação encontrada em ${month} de ${this.monthlyYear()}.`;
  });
  protected readonly monthOptions: readonly GdSelectOption[] = [
    { label: 'Janeiro', value: 1 },
    { label: 'Fevereiro', value: 2 },
    { label: 'Março', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Maio', value: 5 },
    { label: 'Junho', value: 6 },
    { label: 'Julho', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Setembro', value: 9 },
    { label: 'Outubro', value: 10 },
    { label: 'Novembro', value: 11 },
    { label: 'Dezembro', value: 12 },
  ];
  protected readonly yearOptions = computed<readonly GdSelectOption[]>(() => {
    const selectedYear = this.monthlyYear();

    return Array.from({ length: 11 }, (_, index) => {
      const year = selectedYear - 5 + index;

      return { label: `${year}`, value: year };
    });
  });
  protected readonly createdByUserSelectDisabled = computed(() => {
    const farmId = this.selectedFarmStore.selectedFarmId();

    return !farmId || this.createdByUsersLoading();
  });

  protected readonly typeFilterOptions: readonly GdSelectOption[] = [
    { label: 'Receita', value: 'INCOME' },
    { label: 'Despesa', value: 'EXPENSE' },
  ];
  protected readonly recordStatusOptions: readonly GdSelectOption[] = [
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Excluído', value: 'DELETED' },
  ];
  protected readonly createdByUserOptions = computed<readonly GdSelectOption[]>(() => {
    if (this.createdByUsersLoading()) {
      return [{ label: 'Carregando usuários...', value: '__loading__' }];
    }

    return this.createdByUsers().map((user) => ({
      label: user.name,
      value: user.id,
    }));
  });
  protected readonly harvestSeasonFilterOptions = computed<readonly GdSelectOption[]>(() =>
    this.harvestSeasons().map((season) => ({
      label: this.harvestSeasonOptionLabel(season),
      value: season.id,
    })),
  );
  protected readonly paymentStatusChips: readonly ChipOption<PaymentStatus>[] = [
    { label: 'Todos', value: null },
    { label: 'Pendente', value: 'PENDING' },
    { label: 'Pago', value: 'PAID' },
    { label: 'Vencido', value: 'OVERDUE' },
    { label: 'Cancelado', value: 'CANCELED' },
  ];
  protected readonly paymentMethodChips: readonly ChipOption<PaymentMethod>[] = [
    { label: 'Todas', value: null },
    { label: 'PIX', value: 'PIX' },
    { label: 'Dinheiro', value: 'CASH' },
    { label: 'Cartão de crédito', value: 'CREDIT_CARD' },
    { label: 'Cartão de débito', value: 'DEBIT_CARD' },
    { label: 'Transferência', value: 'BANK_TRANSFER' },
    { label: 'Boleto', value: 'BOLETO' },
    { label: 'Cheque', value: 'CHECK' },
    { label: 'Outro', value: 'OTHER' },
  ];

  constructor() {
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.draftTypeFilter.set(
        this.nullableString(this.filterForm.controls.type.value) as TransactionType | null,
      );
      this.clearIncompatibleCategory();
    });

    this.monthlyForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const month = this.numberOrNull(this.monthlyForm.controls.month.value);
      const year = this.numberOrNull(this.monthlyForm.controls.year.value);

      if (!month || month < 1 || month > 12 || !year || year < 1) {
        return;
      }

      this.setMonthlyPeriod(year, month, false);
    });

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();

      untracked(() => {
        this.resetCategoryFilterState();
        this.resetCreatedByUserFilterState();
        this.resetHarvestSeasonFilterState();
        this.applyInitialHarvestSeasonFilter(farmId);
        this.createdByUsers.set([]);
      });

      if (!farmId) {
        this.createdByUsersLoading.set(false);
        return;
      }

      this.createdByUsersLoading.set(true);

      const subscription = this.farmUserService
        .listUserOptions(farmId)
        .pipe(finalize(() => this.createdByUsersLoading.set(false)))
        .subscribe({
          next: (users) => this.createdByUsers.set(users),
          error: () => this.handleCreatedByUsersError(),
        });

      onCleanup(() => subscription.unsubscribe());
    });

    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();

      if (!farmId) {
        this.harvestSeasons.set([]);
        return;
      }

      const subscription = this.harvestSeasonService
        .list({
          farmId,
          includeInactive: true,
          page: 0,
          size: 100,
          sort: 'startDate',
          direction: 'DESC',
        })
        .subscribe({
          next: (response) => this.harvestSeasons.set(response.content),
          error: () => this.handleHarvestSeasonsError(),
        });

      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const control = this.filterForm.controls.createdByUserId;

      untracked(() => {
        if (this.createdByUserSelectDisabled()) {
          if (control.enabled) {
            control.disable({ emitEvent: false });
          }

          return;
        }

        if (control.disabled) {
          control.enable({ emitEvent: false });
        }
      });
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
            this.filterCategories.set(lists.filterCategories);
            this.formCategories.set(lists.formCategories);
            untracked(() => this.clearIncompatibleCategory());
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

    effect((onCleanup) => {
      const activeView = this.activeView();
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      const month = this.monthlyMonth();
      const year = this.monthlyYear();
      const basis = this.monthlyBasis();
      const page = this.monthlyPage();
      this.monthlyReloadTrigger();

      if (activeView !== 'monthly') {
        return;
      }

      if (!farmId || (!isAdmin && (this.isAccessPending() || !this.canViewTransactions()))) {
        this.clearMonthlyListState();
        return;
      }

      this.monthlyError.set(false);
      this.monthlyLoading.set(true);

      const subscription = this.transactionService
        .listByFarm({
          farmId,
          transactionDateStart: this.monthStart(year, month),
          transactionDateEnd: this.monthEnd(year, month),
          basis,
          page,
          size: 10,
          sort: 'transactionDate',
          direction: 'DESC',
        })
        .pipe(finalize(() => this.monthlyLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.monthlyTransactions.set(response.content);
            this.monthlyPageInfo.set({
              totalPages: response.totalPages,
              totalElements: response.totalElements,
              first: response.first,
              last: response.last,
            });
          },
          error: (error: unknown) => this.handleMonthlyListError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });

    effect((onCleanup) => {
      const activeView = this.activeView();
      const farmId = this.selectedFarmStore.selectedFarmId();
      const isAdmin = this.sessionStore.isAdmin();
      const month = this.monthlyMonth();
      const year = this.monthlyYear();
      const basis = this.monthlyBasis();
      this.monthlySummaryReloadTrigger();

      if (activeView !== 'monthly') {
        return;
      }

      if (!farmId || (!isAdmin && (this.isAccessPending() || !this.canViewTransactions()))) {
        this.clearMonthlySummaryState();
        return;
      }

      this.monthlySummary.set(null);
      this.monthlySummaryError.set(false);
      this.monthlySummaryLoading.set(true);

      const subscription = this.transactionService
        .getMonthlySummary({
          farmId,
          transactionDateStart: this.monthStart(year, month),
          transactionDateEnd: this.monthEnd(year, month),
          basis,
        })
        .pipe(finalize(() => this.monthlySummaryLoading.set(false)))
        .subscribe({
          next: (summary) => this.monthlySummary.set(summary),
          error: (error: unknown) => this.handleMonthlySummaryError(error),
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadTrigger.update((value) => value + 1);
    this.monthlyReloadTrigger.update((value) => value + 1);
    this.monthlySummaryReloadTrigger.update((value) => value + 1);
  }

  protected selectView(view: TransactionView): void {
    this.activeView.set(view);
  }

  protected previousMonth(): void {
    const currentDate = new Date(Date.UTC(this.monthlyYear(), this.monthlyMonth() - 1, 1));
    currentDate.setUTCMonth(currentDate.getUTCMonth() - 1);
    this.setMonthlyPeriod(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1);
  }

  protected nextMonth(): void {
    const currentDate = new Date(Date.UTC(this.monthlyYear(), this.monthlyMonth() - 1, 1));
    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    this.setMonthlyPeriod(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1);
  }

  protected toggleMonthlyControlsMenu(): void {
    this.monthlyControlsMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMonthlyControlsMenuWhenClickingOutside(event: MouseEvent): void {
    const target = event.target as Node;
    const clickedButton = this.monthlyControlsButton()?.nativeElement.contains(target) ?? false;
    const clickedMenu = this.monthlyControlsMenu()?.nativeElement.contains(target) ?? false;

    if (!clickedButton && !clickedMenu) {
      this.monthlyControlsMenuOpen.set(false);
    }
  }

  protected selectMonthlyBasis(basis: MonthlyFinancialView): void {
    if (this.monthlyBasis() === basis) {
      this.monthlyControlsMenuOpen.set(false);
      return;
    }

    this.monthlyBasis.set(basis);
    this.monthlyControlsMenuOpen.set(false);

    if (this.monthlyPage() !== 0) {
      this.monthlyPage.set(0);
      return;
    }

    this.monthlyReloadTrigger.update((value) => value + 1);
  }

  protected previousMonthlyPage(): void {
    if (!this.monthlyPageInfo().first) {
      this.monthlyPage.update((value) => Math.max(value - 1, 0));
    }
  }

  protected nextMonthlyPage(): void {
    if (!this.monthlyPageInfo().last) {
      this.monthlyPage.update((value) => value + 1);
    }
  }

  protected applyFilters(): void {
    this.appliedFilters.set(this.buildAppliedFilters());
    this.resetPageAndReload();
  }

  protected resetFilters(): void {
    this.filterForm.reset(EMPTY_FILTER_FORM_VALUE, { emitEvent: false });
    this.draftTypeFilter.set(null);
    this.selectedCategoryIds.set([]);
    this.selectedPaymentStatuses.set([]);
    this.selectedPaymentMethods.set([]);
    this.appliedFilters.set({});
    this.resetPageAndReload();
  }

  protected toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((value) => !value);
  }

  protected selectCategoryFilter(categoryId: number | null): void {
    this.selectedCategoryIds.update((selected) => this.toggleSelection(selected, categoryId));
    this.applyQuickFilters();
  }

  protected selectPaymentStatusFilter(status: PaymentStatus | null): void {
    this.selectedPaymentStatuses.update((selected) => this.toggleSelection(selected, status));
    this.applyQuickFilters();
  }

  protected selectPaymentMethodFilter(method: PaymentMethod | null): void {
    this.selectedPaymentMethods.update((selected) => this.toggleSelection(selected, method));
    this.applyQuickFilters();
  }

  protected sanitizeMoneyFilter(control: GdFormControl): void {
    const sanitized = sanitizeBrazilianMoneyInput(`${control.value ?? ''}`);
    control.setValue(sanitized, { emitEvent: false });
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

  protected exportExcel(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (!farmId || !this.canExportTransactions() || this.exportingExcel()) {
      return;
    }

    this.exportingExcel.set(true);
    this.transactionService
      .exportXlsx(this.exportParams(farmId))
      .pipe(
        finalize(() => this.exportingExcel.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.downloadFile(response.body, this.exportFilename(response, 'xlsx')),
        error: () => this.toastStore.error('Não foi possível gerar o arquivo Excel. Tente novamente.'),
      });
  }

  protected exportPdf(): void {
    const farmId = this.selectedFarmStore.selectedFarmId();
    if (!farmId || !this.canExportTransactions() || this.exportingPdf()) {
      return;
    }

    const pdfWindow = window.open('', '_blank');
    this.exportingPdf.set(true);
    this.transactionService
      .exportPdf(this.exportParams(farmId))
      .pipe(
        finalize(() => this.exportingPdf.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.openPdf(response.body, pdfWindow, this.exportFilename(response, 'pdf')),
        error: () => {
          pdfWindow?.close();
          this.toastStore.error('Não foi possível gerar o PDF. Tente novamente.');
        },
      });
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

          if (this.editingTransaction()?.id === transaction.id) {
            this.resetDrawerState();
          }

          this.toastStore.success('Movimentação cancelada.');
          this.retry();
        },
        error: (error: unknown) => this.showCancelError(error),
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

  protected categoryChipClasses(categoryId: number | null): string {
    return this.chipClasses(this.isSelected(this.selectedCategoryIds(), categoryId));
  }

  protected paymentStatusChipClasses(status: PaymentStatus | null): string {
    return this.chipClasses(this.isSelected(this.selectedPaymentStatuses(), status));
  }

  protected paymentMethodChipClasses(method: PaymentMethod | null): string {
    return this.chipClasses(this.isSelected(this.selectedPaymentMethods(), method));
  }

  protected advancedFiltersLabel(): string {
    const count = this.activeAdvancedFiltersCount();

    return count > 0 ? `Filtros avançados (${count})` : 'Filtros avançados';
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
        ...this.appliedFilters(),
      }),
      filterCategories: this.categoryService.listUsedInTransactions(farmId).pipe(
        catchError((error: unknown) => {
          this.handleFilterCategoriesError(error);
          return of([]);
        }),
      ),
      formCategories: this.categoryService
        .listByFarm(farmId, { status: 'ACTIVE' })
        .pipe(catchError(() => of([]))),
    });
  }

  private exportParams(farmId: number): FinancialTransactionExportParams {
    return { farmId, ...this.appliedFilters() };
  }

  private downloadFile(blob: Blob | null, filename: string): void {
    if (!blob) {
      this.toastStore.error('Não foi possível gerar o arquivo Excel. Tente novamente.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private openPdf(blob: Blob | null, pdfWindow: Window | null, filename: string): void {
    if (!blob) {
      pdfWindow?.close();
      this.toastStore.error('Não foi possível gerar o PDF. Tente novamente.');
      return;
    }

    const url = URL.createObjectURL(blob);
    if (pdfWindow) {
      pdfWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    this.downloadFile(blob, filename);
  }

  private exportFilename(response: HttpResponse<Blob>, extension: string): string {
    const contentDisposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(contentDisposition);
    return match?.[1] ?? `movimentacoes.${extension}`;
  }

  private buildAppliedFilters(): AppliedTransactionFilters {
    const createdByUserId = this.numberOrNull(this.filterForm.controls.createdByUserId.value);
    const harvestSeasonId = this.numberOrNull(this.filterForm.controls.harvestSeasonId.value);

    return {
      transactionDateStart: this.nullableString(this.filterForm.controls.transactionDateStart.value),
      transactionDateEnd: this.nullableString(this.filterForm.controls.transactionDateEnd.value),
      paidAtStart: this.nullableString(this.filterForm.controls.paidAtStart.value),
      paidAtEnd: this.nullableString(this.filterForm.controls.paidAtEnd.value),
      type: this.nullableString(this.filterForm.controls.type.value) as TransactionType | null,
      categoryIds: [...this.selectedCategoryIds()],
      paymentStatuses: [...this.selectedPaymentStatuses()],
      paymentMethods: [...this.selectedPaymentMethods()],
      recordStatus: this.nullableString(this.filterForm.controls.recordStatus.value) as FinancialRecordStatus | null,
      description: this.nullableString(this.filterForm.controls.description.value),
      ...(createdByUserId !== null ? { createdByUserId } : {}),
      harvestSeasonId,
      minAmount: brazilianMoneyToNumber(`${this.filterForm.controls.minAmount.value ?? ''}`),
      maxAmount: brazilianMoneyToNumber(`${this.filterForm.controls.maxAmount.value ?? ''}`),
    };
  }

  private applyQuickFilters(): void {
    this.appliedFilters.update((filters) => ({
      ...filters,
      categoryIds: [...this.selectedCategoryIds()],
      paymentStatuses: [...this.selectedPaymentStatuses()],
      paymentMethods: [...this.selectedPaymentMethods()],
    }));
    this.resetPageAndReload();
  }

  private resetPageAndReload(): void {
    if (this.page() === 0) {
      this.retry();
      return;
    }

    this.page.set(0);
  }

  private clearIncompatibleCategory(): void {
    const type = this.draftTypeFilter();
    const compatibleIds = new Set(
      this.filterCategories()
        .filter((category) => !type || category.type === type)
        .map((category) => category.id),
    );

    this.selectedCategoryIds.update((selected) =>
      selected.filter((categoryId) => compatibleIds.has(categoryId)),
    );
  }

  protected isSelected<T extends string | number>(selected: readonly T[], value: T | null): boolean {
    return value === null ? selected.length === 0 : selected.includes(value);
  }

  private toggleSelection<T extends string | number>(selected: readonly T[], value: T | null): T[] {
    if (value === null) {
      return [];
    }

    return selected.includes(value)
      ? selected.filter((selectedValue) => selectedValue !== value)
      : [...selected, value];
  }

  private chipClasses(active: boolean): string {
    return [
      'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium shadow-sm transition-all duration-200 ease-out',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
      active
        ? 'border-primary bg-primary text-white hover:bg-primary-hover'
        : 'border-border bg-surface text-text-primary hover:border-primary/50 hover:text-primary',
    ].join(' ');
  }

  private isAccessPending(): boolean {
    return (
      this.farmAccessStore.loading() ||
      (!this.farmAccessStore.access() && !this.farmAccessStore.error())
    );
  }

  private handleListError(error: unknown): void {
    this.transactions.set([]);
    this.filterCategories.set([]);
    this.formCategories.set([]);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.error.set(true);
  }

  private categoryChipLabel(category: FinancialCategory): string {
    return category.status === 'INACTIVE' ? category.name + ' (inativa)' : category.name;
  }

  private harvestSeasonOptionLabel(season: HarvestSeason): string {
    const suffixes: Record<string, string> = {
      FINISHED: ' (finalizada)',
      INACTIVE: ' (inativa)',
    };

    return season.name + (suffixes[season.status] ?? '');
  }

  private resetCategoryFilterState(): void {
    if (this.selectedCategoryIds().length > 0) {
      this.selectedCategoryIds.set([]);
    }

    if (this.hasFilterValue(this.appliedFilters().categoryIds)) {
      this.appliedFilters.update((filters) => ({
        ...filters,
        categoryIds: [],
      }));
    }
  }

  private resetCreatedByUserFilterState(): void {
    this.filterForm.controls.createdByUserId.reset('', { emitEvent: false });

    if (this.hasFilterValue(this.appliedFilters().createdByUserId)) {
      this.appliedFilters.update(({ createdByUserId: _createdByUserId, ...filters }) => filters);
    }
  }

  private resetHarvestSeasonFilterState(): void {
    this.filterForm.controls.harvestSeasonId.reset('', { emitEvent: false });

    if (this.hasFilterValue(this.appliedFilters().harvestSeasonId)) {
      this.appliedFilters.update(({ harvestSeasonId: _harvestSeasonId, ...filters }) => filters);
    }
  }

  private applyInitialHarvestSeasonFilter(farmId: number | null): void {
    if (this.initialHarvestSeasonApplied || !farmId || this.initialHarvestSeasonId === null) {
      return;
    }

    this.filterForm.controls.harvestSeasonId.setValue(this.initialHarvestSeasonId, {
      emitEvent: false,
    });
    this.showAdvancedFilters.set(true);
    this.appliedFilters.update((filters) => ({
      ...filters,
      harvestSeasonId: this.initialHarvestSeasonId ?? undefined,
    }));
    this.initialHarvestSeasonApplied = true;
  }

  private queryParamNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const number = Number(value);

    return Number.isInteger(number) && number > 0 ? number : null;
  }

  private handleFilterCategoriesError(_error: unknown): void {
    this.filterCategories.set([]);
    this.resetCategoryFilterState();
    this.toastStore.error('Não foi possível carregar as categorias usadas nas movimentações.');
  }

  private handleCreatedByUsersError(): void {
    this.createdByUsers.set([]);
    this.resetCreatedByUserFilterState();
    this.toastStore.error('Não foi possível carregar os usuários da fazenda.');
  }

  private handleHarvestSeasonsError(): void {
    this.harvestSeasons.set([]);
    this.resetHarvestSeasonFilterState();
    this.toastStore.error('Não foi possível carregar as safras da fazenda.');
  }

  private showCancelError(_error: unknown): void {
    this.toastStore.error('Não foi possível cancelar a movimentação.');
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

  protected monthLabel(month: number): string {
    return this.monthOptions.find((option) => option.value === month)?.label ?? '';
  }

  private setMonthlyPeriod(year: number, month: number, updateForm = true): void {
    const periodChanged = this.monthlyYear() !== year || this.monthlyMonth() !== month;

    if (updateForm) {
      this.monthlyForm.setValue({ month, year }, { emitEvent: false });
    }

    this.monthlyMonth.set(month);
    this.monthlyYear.set(year);

    if (periodChanged && this.monthlyPage() !== 0) {
      this.monthlyPage.set(0);
      return;
    }

    if (periodChanged) {
      this.monthlyReloadTrigger.update((value) => value + 1);
    }
  }

  private monthStart(year: number, month: number): string {
    return this.formatIsoDate(new Date(Date.UTC(year, month - 1, 1)));
  }

  private monthEnd(year: number, month: number): string {
    return this.formatIsoDate(new Date(Date.UTC(year, month, 0)));
  }

  private formatIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private resetDrawerState(): void {
    this.drawerOpen.set(false);
    this.editingTransaction.set(null);
  }

  private clearListState(): void {
    this.transactions.set([]);
    this.filterCategories.set([]);
    this.formCategories.set([]);
    this.createdByUsersLoading.set(false);
    this.pageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });
    this.loading.set(false);
    this.error.set(false);
    this.accessDenied.set(false);
  }

  private clearMonthlyListState(): void {
    this.monthlyTransactions.set([]);
    this.monthlyPage.set(0);
    this.monthlyPageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });
    this.monthlyLoading.set(false);
    this.monthlyError.set(false);
  }

  private clearMonthlySummaryState(): void {
    this.monthlySummary.set(null);
    this.monthlySummaryLoading.set(false);
    this.monthlySummaryError.set(false);
  }

  private handleMonthlyListError(error: unknown): void {
    this.monthlyTransactions.set([]);
    this.monthlyPageInfo.set({ totalPages: 0, totalElements: 0, first: true, last: true });

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.monthlyError.set(true);
  }

  private handleMonthlySummaryError(error: unknown): void {
    this.monthlySummary.set(null);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.accessDenied.set(true);
      return;
    }

    this.monthlySummaryError.set(true);
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

  private hasFilterValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  }
}
