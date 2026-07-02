import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { GdFormControl, Input } from '../../shared/forms';
import { Drawer } from '../../shared/overlays';
import { BrCurrencyPipe } from '../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, Button, Card } from '../../shared/ui';
import {
  HarvestHistoryItem,
  HarvestListItem,
  HarvestStatus,
  harvestHistoryMock,
  harvestSummaryMock,
  harvestsMock,
} from './harvests.mock';

type HarvestStatusFilter = 'ALL' | HarvestStatus;

interface HarvestStatusFilterOption {
  label: string;
  value: HarvestStatusFilter;
}

interface HarvestSummaryCard {
  label: string;
  value: string | number;
  subtext: string;
  icon: string;
  tone: 'primary' | 'success' | 'info' | 'warning';
  currency: boolean;
}

@Component({
  selector: 'gd-harvests-page',
  imports: [
    Badge,
    BrCurrencyPipe,
    Button,
    Card,
    Drawer,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
  ],
  templateUrl: './harvests-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchTerm = signal('');
  private readonly selectedStatus = signal<HarvestStatusFilter>('ALL');

  protected readonly searchControl: GdFormControl = new FormControl('');
  protected readonly drawerOpen = signal(false);
  protected readonly selectedHarvest = signal<HarvestListItem | null>(null);
  protected readonly summary = harvestSummaryMock;
  protected readonly historyItems = harvestHistoryMock;
  protected readonly statusFilters: readonly HarvestStatusFilterOption[] = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Ativas', value: 'IN_PRODUCTION' },
    { label: 'Planejadas', value: 'PLANNED' },
    { label: 'Encerradas', value: 'FINISHED' },
  ];

  protected readonly summaryCards = computed<readonly HarvestSummaryCard[]>(() => [
    {
      label: 'Safras ativas',
      value: this.summary.activeSeasons,
      subtext: '2 em produção',
      icon: 'sprout',
      tone: 'primary',
      currency: false,
    },
    {
      label: 'Custo total',
      value: this.summary.totalCost,
      subtext: 'Investimento acumulado',
      icon: 'briefcase-business',
      tone: 'warning',
      currency: true,
    },
    {
      label: 'Receita prevista',
      value: this.summary.expectedRevenue,
      subtext: 'Próximas colheitas',
      icon: 'trending-up',
      tone: 'success',
      currency: true,
    },
    {
      label: 'Lucro estimado',
      value: this.summary.estimatedProfit,
      subtext: 'Margem consolidada',
      icon: 'chart-no-axes-combined',
      tone: 'info',
      currency: true,
    },
  ]);

  protected readonly filteredHarvests = computed(() => {
    const search = this.normalizeText(this.searchTerm());
    const status = this.selectedStatus();

    return harvestsMock.filter((harvest) => {
      const matchesSearch = !search || this.normalizeText(harvest.name).includes(search);
      const matchesStatus = status === 'ALL' || harvest.status === status;

      return matchesSearch && matchesStatus;
    });
  });

  protected readonly drawerTitle = computed(() =>
    this.selectedHarvest() ? 'Detalhes da safra' : 'Nova safra',
  );

  protected readonly drawerDescription = computed(() =>
    this.selectedHarvest()
      ? 'A visualização detalhada será implementada na próxima etapa.'
      : 'Cadastro de safra',
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(String(value ?? '').trim()));
  }

  protected selectStatus(status: HarvestStatusFilter): void {
    this.selectedStatus.set(status);
  }

  protected isSelectedStatus(status: HarvestStatusFilter): boolean {
    return this.selectedStatus() === status;
  }

  protected openCreateDrawer(): void {
    this.selectedHarvest.set(null);
    this.drawerOpen.set(true);
  }

  protected openDetailsDrawer(harvest: HarvestListItem): void {
    this.selectedHarvest.set(harvest);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected statusLabel(status: HarvestStatus): string {
    const labels: Record<HarvestStatus, string> = {
      IN_PRODUCTION: 'Em produção',
      PLANNED: 'Planejada',
      FINISHED: 'Encerrada',
    };

    return labels[status];
  }

  protected statusVariant(status: HarvestStatus): BadgeVariant {
    const variants: Record<HarvestStatus, BadgeVariant> = {
      IN_PRODUCTION: 'success',
      PLANNED: 'warning',
      FINISHED: 'neutral',
    };

    return variants[status];
  }

  protected summaryToneClasses(tone: HarvestSummaryCard['tone']): string {
    const tones: Record<HarvestSummaryCard['tone'], string> = {
      primary: 'bg-highlight-soft text-primary',
      success: 'bg-success/10 text-success',
      info: 'bg-info/10 text-info',
      warning: 'bg-warning/10 text-amber-700 dark:text-amber-300',
    };

    return tones[tone];
  }

  protected amountPrefix(item: HarvestHistoryItem): string {
    if (item.type === 'INCOME') {
      return '+ ';
    }

    if (item.type === 'EXPENSE') {
      return '- ';
    }

    return '';
  }

  protected amountClasses(item: HarvestHistoryItem): string {
    if (item.type === 'INCOME') {
      return 'text-success';
    }

    if (item.type === 'EXPENSE') {
      return 'text-danger';
    }

    return 'text-text-muted';
  }

  protected formatHistoryAmount(item: HarvestHistoryItem): number | null {
    return item.amount === null ? null : Math.abs(item.amount);
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date));
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
