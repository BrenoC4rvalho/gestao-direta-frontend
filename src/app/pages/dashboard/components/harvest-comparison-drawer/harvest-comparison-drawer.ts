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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  HarvestSeason,
  HarvestSeasonComparison,
  HarvestSeasonComparisonMetric,
} from '../../../../core/models/harvest-season.models';
import { HarvestSeasonService } from '../../../../core/services/harvest-season.service';
import { GdSelectOption, Select } from '../../../../shared/forms';
import { Drawer } from '../../../../shared/overlays';
import { BrCurrencyPipe } from '../../../../shared/pipes/br-currency.pipe';
import { Badge, BadgeVariant, EmptyState, ErrorState, Skeleton, Tooltip } from '../../../../shared/ui';

interface ComparisonRow {
  label: string;
  metric: HarvestSeasonComparisonMetric;
  valueA: number | null;
  valueB: number | null;
  format: 'currency' | 'percentage';
}

type ComparisonGroup = 'planning' | 'projection' | 'realized' | 'perHectare';
type RowDefinition = readonly [
  string,
  HarvestSeasonComparisonMetric,
  ComparisonGroup,
  string,
  ComparisonRow['format'],
];

interface ComparisonSection {
  id: 'planning' | 'projection' | 'realized' | 'per-hectare';
  label: string;
  rows: readonly ComparisonRow[];
}

@Component({
  selector: 'gd-harvest-comparison-drawer',
  imports: [
    Drawer,
    EmptyState,
    ErrorState,
    Badge,
    LucideDynamicIcon,
    ReactiveFormsModule,
    Select,
    Skeleton,
    Tooltip,
  ],
  templateUrl: './harvest-comparison-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HarvestComparisonDrawer {
  private readonly harvestSeasonService = inject(HarvestSeasonService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly farmId = input<number | null>(null);
  readonly closed = output<void>();

  protected readonly harvestAControl = new FormControl<number | null>(null);
  protected readonly harvestBControl = new FormControl<number | null>(null);
  private readonly selectedHarvestAId = signal<number | null>(null);
  private readonly selectedHarvestBId = signal<number | null>(null);
  protected readonly seasons = signal<readonly HarvestSeason[]>([]);
  protected readonly seasonsLoading = signal(false);
  protected readonly comparison = signal<HarvestSeasonComparison | null>(null);
  protected readonly comparisonLoading = signal(false);
  protected readonly comparisonError = signal<string | null>(null);
  protected readonly selectionError = signal<string | null>(null);
  private lastFarmId: number | null = null;

  protected readonly harvestAOptions = computed(() => this.optionsExcluding(this.selectedHarvestBId()));
  protected readonly harvestBOptions = computed(() => this.optionsExcluding(this.selectedHarvestAId()));

  protected readonly comparisonSections = computed<readonly ComparisonSection[]>(() => {
    const comparison = this.comparison();

    return [
      {
        id: 'planning',
        label: 'Planejamento',
        rows: this.rows(comparison, [
          ['Custo planejado', 'PLANNED_COST', 'planning', 'plannedCost', 'currency'],
          ['Receita planejada', 'PLANNED_REVENUE', 'planning', 'plannedRevenue', 'currency'],
          ['Resultado planejado', 'PLANNED_RESULT', 'planning', 'plannedProfit', 'currency'],
          ['Margem planejada', 'PLANNED_MARGIN', 'planning', 'plannedMargin', 'percentage'],
        ]),
      },
      {
        id: 'projection',
        label: 'Projeção',
        rows: this.rows(comparison, [
          ['Custo projetado', 'PROJECTED_COST', 'projection', 'projectedCost', 'currency'],
          ['Receita projetada', 'PROJECTED_REVENUE', 'projection', 'projectedRevenue', 'currency'],
          ['Lucro projetado', 'PROJECTED_PROFIT', 'projection', 'projectedProfit', 'currency'],
          ['Margem projetada', 'PROJECTED_MARGIN', 'projection', 'projectedMargin', 'percentage'],
        ]),
      },
      {
        id: 'realized',
        label: 'Realizado',
        rows: this.rows(comparison, [
          ['Custo realizado', 'REALIZED_COST', 'realized', 'realizedCost', 'currency'],
          ['Receita realizada', 'REALIZED_REVENUE', 'realized', 'realizedRevenue', 'currency'],
          ['Lucro realizado', 'REALIZED_PROFIT', 'realized', 'realizedProfit', 'currency'],
          ['Margem realizada', 'REALIZED_MARGIN', 'realized', 'realizedMargin', 'percentage'],
        ]),
      },
      {
        id: 'per-hectare',
        label: 'Indicadores por hectare',
        rows: this.rows(comparison, [
          ['Custo planejado / ha', 'PLANNED_COST_PER_HECTARE', 'perHectare', 'plannedCostPerHectare', 'currency'],
          ['Receita planejada / ha', 'PLANNED_REVENUE_PER_HECTARE', 'perHectare', 'plannedRevenuePerHectare', 'currency'],
          ['Resultado planejado / ha', 'PLANNED_RESULT_PER_HECTARE', 'perHectare', 'plannedResultPerHectare', 'currency'],
          ['Custo projetado / ha', 'PROJECTED_COST_PER_HECTARE', 'perHectare', 'projectedCostPerHectare', 'currency'],
          ['Receita projetada / ha', 'PROJECTED_REVENUE_PER_HECTARE', 'perHectare', 'projectedRevenuePerHectare', 'currency'],
          ['Lucro projetado / ha', 'PROJECTED_PROFIT_PER_HECTARE', 'perHectare', 'projectedProfitPerHectare', 'currency'],
          ['Custo realizado / ha', 'REALIZED_COST_PER_HECTARE', 'perHectare', 'realizedCostPerHectare', 'currency'],
          ['Receita realizada / ha', 'REALIZED_REVENUE_PER_HECTARE', 'perHectare', 'realizedRevenuePerHectare', 'currency'],
          ['Lucro realizado / ha', 'REALIZED_PROFIT_PER_HECTARE', 'perHectare', 'realizedProfitPerHectare', 'currency'],
        ]),
      },
    ];
  });

  private readonly loadForOpenDrawer = effect(() => {
    const farmId = this.farmId();
    if (!this.open() || !farmId || this.lastFarmId === farmId) return;

    this.lastFarmId = farmId;
    this.resetComparison();
    this.seasonsLoading.set(true);
    this.harvestSeasonService
      .list({ farmId, includeInactive: true, page: 0, size: 100, sort: 'startDate', direction: 'DESC' })
      .pipe(finalize(() => this.seasonsLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (response) => this.seasons.set(response.content), error: () => this.seasons.set([]) });
  });

  constructor() {
    this.harvestAControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.selectedHarvestAId.set(value);
      this.loadComparison();
    });
    this.harvestBControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.selectedHarvestBId.set(value);
      this.loadComparison();
    });
  }

  protected close(): void {
    this.lastFarmId = null;
    this.resetComparison();
    this.closed.emit();
  }

  protected retry(): void {
    this.loadComparison();
  }

  protected format(value: number | null, format: ComparisonRow['format']): string {
    if (value === null) return '—';
    if (format === 'percentage') {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    return new BrCurrencyPipe().transform(value);
  }

  protected formatArea(areaHectares: number | null): string {
    if (areaHectares === null) return 'Área não informada';
    return `${areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`;
  }

  protected formatPeriod(startDate: string, endDate: string | null): string {
    const formatDate = (date: string) =>
      new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

    return `${formatDate(startDate)} — ${endDate ? formatDate(endDate) : 'Sem data final'}`;
  }

  protected formatDuration(startDate: string, endDate: string | null): string {
    const start = this.parseUtcDate(startDate);
    const end = this.parseUtcDate(endDate ?? new Date().toISOString().slice(0, 10));
    const calendarMonths =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      start.getUTCMonth() +
      1;
    const months = Math.max(0, calendarMonths);

    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }

  protected tooltip(metric: HarvestSeasonComparisonMetric): string | null {
    const tooltips: Partial<Record<HarvestSeasonComparisonMetric, string>> = {
      REALIZED_COST: 'Total de despesas realizadas vinculadas à Safra.',
      REALIZED_PROFIT: 'Receita realizada menos custo realizado.',
      REALIZED_MARGIN: 'Percentual do resultado realizado em relação à receita realizada.',
    };

    return tooltips[metric] ?? null;
  }

  protected statusVariant(status: HarvestSeason['status']): BadgeVariant {
    const variants: Record<HarvestSeason['status'], BadgeVariant> = {
      PLANNED: 'info',
      IN_PROGRESS: 'success',
      FINISHED: 'neutral',
      INACTIVE: 'neutral',
    };

    return variants[status];
  }

  private loadComparison(): void {
    const farmId = this.farmId();
    const harvestSeasonIdA = this.harvestAControl.value;
    const harvestSeasonIdB = this.harvestBControl.value;
    this.comparison.set(null);
    this.comparisonError.set(null);
    if (!farmId || harvestSeasonIdA === null || harvestSeasonIdB === null) return;
    if (harvestSeasonIdA === harvestSeasonIdB) {
      this.selectionError.set('Selecione Safras diferentes para comparar.');
      return;
    }

    this.selectionError.set(null);
    this.comparisonLoading.set(true);
    this.harvestSeasonService
      .compareHarvestSeasons(farmId, harvestSeasonIdA, harvestSeasonIdB)
      .pipe(finalize(() => this.comparisonLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comparison) => this.comparison.set(comparison),
        error: () => this.comparisonError.set('Não foi possível comparar as Safras selecionadas.'),
      });
  }

  private optionsExcluding(selectedId: number | null): readonly GdSelectOption[] {
    return this.seasons()
      .filter((season) => season.id !== selectedId)
      .map((season) => ({
        label: `${season.name} · ${season.productionActivityName} · ${this.statusLabel(season.status)}`,
        value: season.id,
      }));
  }

  private rows(
    comparison: HarvestSeasonComparison | null,
    definitions: readonly RowDefinition[],
  ): readonly ComparisonRow[] {
    if (!comparison) return [];
    return definitions.map(([label, metric, group, field, format]) => ({
      label,
      metric,
      valueA: (comparison.harvestA[group] as Record<string, number | null> | null)?.[field] ?? null,
      valueB: (comparison.harvestB[group] as Record<string, number | null> | null)?.[field] ?? null,
      format,
    }));
  }

  private parseUtcDate(date: string): Date {
    return new Date(`${date}T00:00:00Z`);
  }

  private resetComparison(): void {
    this.harvestAControl.setValue(null, { emitEvent: false });
    this.harvestBControl.setValue(null, { emitEvent: false });
    this.selectedHarvestAId.set(null);
    this.selectedHarvestBId.set(null);
    this.comparison.set(null);
    this.comparisonError.set(null);
    this.selectionError.set(null);
  }

  protected statusLabel(status: HarvestSeason['status']): string {
    return { PLANNED: 'Planejada', IN_PROGRESS: 'Em andamento', FINISHED: 'Finalizada', INACTIVE: 'Inativa' }[status];
  }
}
