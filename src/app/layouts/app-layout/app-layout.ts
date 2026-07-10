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
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter, finalize } from 'rxjs';

import { DashboardAiTransactionActionService } from '../../core/services/dashboard-ai-transaction-action.service';
import { FarmAccessService } from '../../core/services/farm-access.service';
import { FarmService } from '../../core/services/farm.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';
import { Button } from '../../shared/ui';
import { DesktopSidebar } from '../desktop-sidebar/desktop-sidebar';
import { FarmContextSelector } from '../farm-context-selector/farm-context-selector';
import { MobileHeader } from '../mobile-header/mobile-header';

interface PageHeaderData {
  title: string;
  subtitle: string;
}

@Component({
  selector: 'gd-app-layout',
  imports: [
    Button,
    DesktopSidebar,
    FarmContextSelector,
    LucideDynamicIcon,
    MobileHeader,
    RouterOutlet,
  ],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout implements OnInit {
  private readonly dashboardAiTransactionAction = inject(DashboardAiTransactionActionService);
  private readonly farmAccessService = inject(FarmAccessService);
  private readonly farmService = inject(FarmService);
  private readonly farmAccessStore = inject(FarmAccessStore);
  private readonly router = inject(Router);
  private readonly selectedFarmStore = inject(SelectedFarmStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly toastStore = inject(ToastStore);
  private readonly pageHeaderData = signal<PageHeaderData>({
    title: '',
    subtitle: '',
  });

  protected readonly pageTitle = computed(() => {
    const title = this.pageHeaderData().title;

    if (title === 'Dashboard') {
      return `Olá, ${this.sessionStore.userName() ?? 'produtor'}`;
    }

    return title;
  });
  protected readonly pageSubtitle = computed(() => this.pageHeaderData().subtitle);
  protected readonly isDashboardRoute = computed(
    () => this.pageHeaderData().title === 'Dashboard',
  );
  protected readonly canShowAiTransactionButton = computed(() => {
    const user = this.sessionStore.user();

    if (!this.isDashboardRoute() || user?.status !== 'ACTIVE') {
      return false;
    }

    if (this.sessionStore.isAdmin()) {
      return true;
    }

    const farmId = this.selectedFarmStore.selectedFarmId();
    const access = this.farmAccessStore.access();

    return (
      !!farmId &&
      access?.farmId === farmId &&
      (access.role === 'PRODUCER' || access.role === 'EMPLOYEE') &&
      access.permissions.canManageTransactions
    );
  });
  protected readonly aiTransactionButtonDisabled = computed(
    () => !this.selectedFarmStore.selectedFarmId(),
  );
  protected readonly aiTransactionButtonTitle = computed(() =>
    this.aiTransactionButtonDisabled()
      ? 'Selecione uma fazenda para registrar uma movimentação.'
      : 'Nova movimentação com IA',
  );

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
    if (this.aiTransactionButtonDisabled()) {
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
    let route = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const title = route.data['title'];
    const subtitle = route.data['subtitle'];

    this.pageHeaderData.set({
      title: typeof title === 'string' ? title : '',
      subtitle: typeof subtitle === 'string' ? subtitle : '',
    });
  }
}
