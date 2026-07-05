import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';

import {
  FinancialAlerts,
  FinancialSummary,
  FinancialTransaction,
} from '../../core/models/financial.models';
import { HarvestSeasonSummaryListItem } from '../../core/models/harvest-season.models';
import { FinancialService } from '../../core/services/financial.service';
import { HarvestSeasonService } from '../../core/services/harvest-season.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { Badge, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { ImportantAlerts } from './components/important-alerts/important-alerts';
import { LatestTransactionsCard } from './components/latest-transactions-card/latest-transactions-card';
import { SummaryCard, SummaryCardTone } from './components/summary-card/summary-card';

interface SummaryCardViewModel {
  title: string;
  value: string;
  description: string;
  detail?: string;
  icon: string;
  tone: SummaryCardTone;
}

@Component({
  selector: 'gd-dashboard-page',
  imports: [
    Badge,
    EmptyState,
    ErrorState,
    ImportantAlerts,
    LatestTransactionsCard,
    RouterLink,
    Skeleton,
    SummaryCard,
  ],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly financialService = inject(FinancialService);
  private readonly harvestSeasonService = inject(HarvestSeasonService);

  protected readonly farmAccessStore = inject(FarmAccessStore);
  protected readonly selectedFarmStore = inject(SelectedFarmStore);
  protected readonly sessionStore = inject(SessionStore);

  protected readonly summary = signal<FinancialSummary | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryError = signal<string | null>(null);

  protected readonly transactions = signal<readonly FinancialTransaction[]>([]);
  protected readonly transactionsLoading = signal(false);
  protected readonly transactionsError = signal<string | null>(null);

  protected readonly alerts = signal<FinancialAlerts | null>(null);
  protected readonly alertsLoading = signal(false);
  protected readonly alertsError = signal<string | null>(null);

  protected readonly inProgressHarvests = signal<readonly HarvestSeasonSummaryListItem[]>([]);
  protected readonly harvestsLoading = signal(false);
  protected readonly harvestsError = signal<string | null>(null);

  protected readonly summarySkeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly harvestSkeletons = [1, 2, 3];

  private readonly currencyPipe = new BrCurrencyPipe();

  protected readonly summaryCards = computed<readonly SummaryCardViewModel[]>(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return [
      {
        title: 'Saldo atual',
        value: this.formatCurrency(summary.currentBalance),
        description: 'Resultado financeiro já realizado: entradas pagas menos saídas pagas.',
        detail: 'Considera apenas movimentações pagas.',
        icon: 'wallet',
        tone: summary.currentBalance >= 0 ? 'success' : 'danger',
      },
      {
        title: 'Entradas previstas',
        value: this.formatCurrency(summary.expectedIncome),
        description: 'Total de receitas que ainda não foram recebidas.',
        detail: 'Inclui entradas pendentes e atrasadas, exceto canceladas.',
        icon: 'trending-up',
        tone: 'success',
      },
      {
        title: 'Saídas previstas',
        value: this.formatCurrency(summary.expectedExpense),
        description: 'Total de despesas que ainda não foram pagas.',
        detail: 'Inclui saídas pendentes e atrasadas, exceto canceladas.',
        icon: 'trending-down',
        tone: 'warning',
      },
      {
        title: 'Saldo projetado',
        value: this.formatCurrency(summary.projectedBalance),
        description: 'Saldo esperado após considerar entradas e saídas previstas.',
        detail: 'Calculado por: saldo atual + entradas previstas - saídas previstas.',
        icon: 'wallet',
        tone: summary.projectedBalance >= 0 ? 'success' : 'danger',
      },
      {
        title: 'A pagar em 30 dias',
        value: this.formatCurrency(summary.payableNext30Days),
        description: 'Despesas pendentes com vencimento nos próximos 30 dias.',
        detail: 'Não inclui contas já atrasadas.',
        icon: 'calendar-clock',
        tone: 'warning',
      },
      {
        title: 'Atrasado',
        value: this.formatCurrency(summary.overdueExpenses),
        description: 'Despesas vencidas que ainda não foram pagas.',
        detail: 'Indica compromissos financeiros em atraso.',
        icon: 'alert-circle',
        tone: 'danger',
      },
      {
        title: 'A receber em 30 dias',
        value: this.formatCurrency(summary.receivableNext30Days),
        description: 'Receitas atrasadas ou previstas para os próximos 30 dias.',
        detail: 'Ajuda a visualizar o dinheiro que deve entrar no curto prazo.',
        icon: 'landmark',
        tone: 'info',
      },
      {
        title: 'Fluxo 30 dias',
        value: this.formatCurrency(summary.cashFlowNext30Days),
        description: 'Diferença entre valores a receber e contas a pagar no curto prazo.',
        detail: 'Calculado por: a receber - a pagar em 30 dias - atrasado.',
        icon: 'chart-no-axes-combined',
        tone: summary.cashFlowNext30Days >= 0 ? 'success' : 'danger',
      },
    ];
  });

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
      this.loadAlerts(farmId, subscriptions);
      this.loadInProgressHarvests(farmId, subscriptions);

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

  private loadAlerts(farmId: number, subscriptions: Subscription): void {
    this.alerts.set(null);
    this.alertsError.set(null);
    this.alertsLoading.set(true);

    subscriptions.add(
      this.financialService
        .getAlerts(farmId)
        .pipe(finalize(() => this.alertsLoading.set(false)))
        .subscribe({
          next: (alerts) => this.alerts.set(alerts),
          error: () => this.alertsError.set('Não foi possível carregar os alertas financeiros.'),
        }),
    );
  }

  private loadInProgressHarvests(farmId: number, subscriptions: Subscription): void {
    this.inProgressHarvests.set([]);
    this.harvestsError.set(null);
    this.harvestsLoading.set(true);

    subscriptions.add(
      this.harvestSeasonService
        .listSummary({
          farmId,
          status: 'IN_PROGRESS',
          page: 0,
          size: 3,
          sort: 'startDate',
          direction: 'DESC',
        })
        .pipe(finalize(() => this.harvestsLoading.set(false)))
        .subscribe({
          next: (response) => this.inProgressHarvests.set(response.content),
          error: () =>
            this.harvestsError.set('Não foi possível carregar as safras em andamento.'),
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
    this.alerts.set(null);
    this.alertsLoading.set(false);
    this.alertsError.set(null);
    this.inProgressHarvests.set([]);
    this.harvestsLoading.set(false);
    this.harvestsError.set(null);
  }

  protected formatHarvestCurrency(value: number | null | undefined): string {
    return this.formatCurrency(value ?? 0);
  }

  protected isNegativeHarvestProfit(value: number | null | undefined): boolean {
    return (value ?? 0) < 0;
  }

  private formatCurrency(value: number): string {
    return this.currencyPipe.transform(value);
  }
}
