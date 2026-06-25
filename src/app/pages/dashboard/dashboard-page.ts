import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import {
  FinancialSummary,
  FinancialTransaction,
  UpcomingBill,
} from '../../core/models/financial.models';
import { FinancialService } from '../../core/services/financial.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { LatestTransactionsCard } from './components/latest-transactions-card/latest-transactions-card';
import { SummaryCard, SummaryCardTone } from './components/summary-card/summary-card';
import { UpcomingBillsCard } from './components/upcoming-bills-card/upcoming-bills-card';

interface SummaryCardViewModel {
  title: string;
  value: string;
  helper: string;
  icon: string;
  tone: SummaryCardTone;
}

@Component({
  selector: 'gd-dashboard-page',
  imports: [
    EmptyState,
    ErrorState,
    LatestTransactionsCard,
    LucideDynamicIcon,
    RouterLink,
    Skeleton,
    SummaryCard,
    UpcomingBillsCard,
  ],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly financialService = inject(FinancialService);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly summary = signal<FinancialSummary | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  protected readonly transactions = signal<readonly FinancialTransaction[]>([]);
  protected readonly transactionsLoading = signal(false);
  protected readonly transactionsError = signal<string | null>(null);

  protected readonly upcomingBills = signal<readonly UpcomingBill[]>([]);
  protected readonly upcomingBillsLoading = signal(false);
  protected readonly upcomingBillsError = signal<string | null>(null);

  protected readonly summarySkeletons = [1, 2, 3, 4, 5, 6];

  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  protected readonly summaryCards = computed<readonly SummaryCardViewModel[]>(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return [
      {
        title: 'Saldo atual',
        value: this.formatCurrency(summary.paidTotal),
        helper: 'Valores pagos até agora',
        icon: 'wallet',
        tone: 'info',
      },
      {
        title: 'Entradas previstas',
        value: this.formatCurrency(summary.incomeTotal),
        helper: 'Receitas do período',
        icon: 'plus',
        tone: 'success',
      },
      {
        title: 'Saídas previstas',
        value: this.formatCurrency(summary.expenseTotal),
        helper: 'Despesas do período',
        icon: 'receipt-text',
        tone: 'danger',
      },
      {
        title: 'Saldo projetado',
        value: this.formatCurrency(summary.balance),
        helper: 'Resultado financeiro',
        icon: 'wallet',
        tone: summary.balance >= 0 ? 'success' : 'danger',
      },
      {
        title: 'Pendências',
        value: this.formatCurrency(summary.pendingTotal),
        helper: 'Valores pendentes',
        icon: 'calendar-clock',
        tone: 'warning',
      },
      {
        title: 'Atrasado',
        value: this.formatCurrency(summary.overdueTotal),
        helper: 'Valores vencidos',
        icon: 'alert-circle',
        tone: 'danger',
      },
    ];
  });

  protected readonly upcomingBillsTotal = computed(() =>
    this.upcomingBills().reduce((total, bill) => total + bill.amount, 0),
  );

  protected readonly emptyFarmDescription = computed(() => {
    if (this.selectedFarmStore.loaded() && !this.selectedFarmStore.hasFarms()) {
      return 'Nenhuma fazenda está disponível para o seu usuário.';
    }

    return 'Selecione uma fazenda no topo do dashboard para visualizar os indicadores financeiros.';
  });

  constructor() {
    effect((onCleanup) => {
      const farmId = this.selectedFarmStore.selectedFarmId();
      const access = this.farmAccessStore.access();
      const accessLoading = this.farmAccessStore.loading();

      if (
        !farmId ||
        accessLoading ||
        access?.farmId !== farmId ||
        !access.permissions.canViewFinancial
      ) {
        this.clearDashboardData();
        return;
      }

      const subscriptions = new Subscription();
      this.loadSummary(farmId, subscriptions);
      this.loadTransactions(farmId, subscriptions);
      this.loadUpcomingBills(farmId, subscriptions);

      onCleanup(() => subscriptions.unsubscribe());
    });
  }

  private loadSummary(farmId: number, subscriptions: Subscription): void {
    this.summary.set(null);
    this.summaryError.set(null);
    this.summaryLoading.set(true);

    subscriptions.add(
      this.financialService
        .getSummary(farmId)
        .pipe(finalize(() => this.summaryLoading.set(false)))
        .subscribe({
          next: (summary) => this.summary.set(summary),
          error: () => this.summaryError.set('Não foi possível carregar o resumo financeiro.'),
        }),
    );
  }

  private loadTransactions(farmId: number, subscriptions: Subscription): void {
    this.transactions.set([]);
    this.transactionsError.set(null);
    this.transactionsLoading.set(true);

    subscriptions.add(
      this.financialService
        .getLatestTransactions(farmId)
        .pipe(finalize(() => this.transactionsLoading.set(false)))
        .subscribe({
          next: (response) => this.transactions.set(response.content),
          error: () =>
            this.transactionsError.set('Não foi possível carregar as últimas movimentações.'),
        }),
    );
  }

  private loadUpcomingBills(farmId: number, subscriptions: Subscription): void {
    this.upcomingBills.set([]);
    this.upcomingBillsError.set(null);
    this.upcomingBillsLoading.set(true);

    subscriptions.add(
      this.financialService
        .getUpcomingBills(farmId)
        .pipe(finalize(() => this.upcomingBillsLoading.set(false)))
        .subscribe({
          next: (response) => this.upcomingBills.set(response.content),
          error: () => this.upcomingBillsError.set('Não foi possível carregar as contas a vencer.'),
        }),
    );
  }

  private clearDashboardData(): void {
    this.summary.set(null);
    this.summaryLoading.set(false);
    this.summaryError.set(null);
    this.transactions.set([]);
    this.transactionsLoading.set(false);
    this.transactionsError.set(null);
    this.upcomingBills.set([]);
    this.upcomingBillsLoading.set(false);
    this.upcomingBillsError.set(null);
  }

  protected formatCurrencyValue(value: number): string {
    return this.formatCurrency(value);
  }

  private formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }
}
