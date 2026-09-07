import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { DashboardAiTransactionActionService } from '../../core/services/dashboard-ai-transaction-action.service';
import { FarmAccessService } from '../../core/services/farm-access.service';
import { FarmService } from '../../core/services/farm.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { PageHeaderStore } from '../../core/stores/page-header.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { PendingFinancialTransactionsStore } from '../../core/stores/pending-financial-transactions.store';
import { ToastStore } from '../../core/stores/toast.store';
import { Badge, FloatingActionButton, Skeleton } from '../../shared/ui';
import { DesktopSidebar } from '../desktop-sidebar/desktop-sidebar';
import { FarmContextSelector } from '../farm-context-selector/farm-context-selector';
import { MobileHeader } from '../mobile-header/mobile-header';

interface PageHeaderData {
  title: string;
  subtitle: string;
  dynamicHeader: string | null;
}

@Component({
  selector: 'gd-app-layout',
  imports: [
    DesktopSidebar,
    FarmContextSelector,
    FloatingActionButton,
    MobileHeader,
    RouterOutlet,
    Badge,
    Skeleton,
  ],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout implements OnInit {
  private readonly dashboardAiTransactionAction = inject(DashboardAiTransactionActionService);
  private readonly farmAccessService = inject(FarmAccessService);
  private readonly farmService = inject(FarmService);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly pageHeaderStore = inject(PageHeaderStore);
  private readonly router = inject(Router);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly pendingTransactionsStore = inject(PendingFinancialTransactionsStore);
  private readonly toastStore = inject(ToastStore);
  private readonly pageHeaderData = signal<PageHeaderData>({
    title: '',
    subtitle: '',
    dynamicHeader: null,
  });

  protected readonly pageTitle = computed(() => {
    const title = this.pageHeaderData().title;

    if (title === 'Dashboard') {
      return `Olá, ${this.sessionStore.userName() ?? 'produtor'}`;
    }

    return title;
  });
  protected readonly pageSubtitle = computed(() => this.pageHeaderData().subtitle);
  protected readonly isHarvestDetailsHeader = computed(
    () => this.pageHeaderData().dynamicHeader === 'harvest-details',
  );
  protected readonly harvestHeader = computed(() => this.pageHeaderStore.harvestHeader());
  protected readonly mainClasses = computed(() =>
    this.isHarvestDetailsHeader()
      ? 'px-4 py-4 sm:px-6 lg:px-8 lg:py-4'
      : 'px-4 py-5 sm:px-6 lg:px-8 lg:py-6',
  );
  protected readonly isDashboardRoute = computed(
    () => this.pageHeaderData().title === 'Dashboard',
  );
  protected readonly canShowAiTransactionFab = computed(() => {
    const user = this.sessionStore.user();
    const farmId = this.selectedFarmStore.selectedFarmId();

    if (!this.isDashboardRoute() || !farmId || user?.status !== 'ACTIVE') {
      return false;
    }

    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const access = this.farmAccessStore.access();

    return (
      access?.farmId === farmId &&
      (access.role === 'PRODUCER' || access.role === 'EMPLOYEE') &&
      access.permissions.canManageTransactions
    );
  });
  constructor() {
    this.updatePageHeaderData();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updatePageHeaderData());

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

  protected requestAiTransaction(): void {
    if (!this.canShowAiTransactionFab()) {
      return;
    }

    this.dashboardAiTransactionAction.requestOpen();
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

  private updatePageHeaderData(): void {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let title = '';
    let subtitle = '';
    let dynamicHeader: string | null = null;

    while (route) {
      const routeTitle = route.data['title'];
      const routeSubtitle = route.data['subtitle'];
      const routeDynamicHeader = route.data['dynamicHeader'];

      if (typeof routeTitle === 'string') {
        title = routeTitle;
      }

      if (typeof routeSubtitle === 'string') {
        subtitle = routeSubtitle;
      }

      if (typeof routeDynamicHeader === 'string') {
        dynamicHeader = routeDynamicHeader;
      }

      route = route.firstChild;
    }

    this.pageHeaderData.set({ title, subtitle, dynamicHeader });
  }
}
