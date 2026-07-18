import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { ChartConfiguration, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { ThemeStore } from '../../../../../core/stores/theme.store';
import { FinancialEvolutionPoint } from '../../financial-report.models';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'gd-financial-evolution-chart',
  imports: [BaseChartDirective],
  templateUrl: './financial-evolution-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialEvolutionChart {
  readonly points = input.required<readonly FinancialEvolutionPoint[]>();
  readonly periodSelected = output<FinancialEvolutionPoint>();

  private readonly themeStore = inject(ThemeStore);
  private readonly chartDirective = viewChild(BaseChartDirective);

  protected readonly chartType = 'bar' as const;
  protected readonly chartData = computed<ChartConfiguration<'bar' | 'line'>['data']>(() => ({
    labels: this.points().map((point) => point.label),
    datasets: [
      { type: 'bar', label: 'Receitas', data: this.points().map((point) => point.income), backgroundColor: '#22C55E', borderRadius: 4 },
      { type: 'bar', label: 'Despesas', data: this.points().map((point) => point.expense), backgroundColor: '#DC2626', borderRadius: 4 },
      { type: 'line', label: 'Saldo', data: this.points().map((point) => point.netBalance), borderColor: '#2563EB', backgroundColor: '#2563EB', borderWidth: 2, tension: 0.3, pointRadius: 3, pointHoverRadius: 5 },
    ],
  }));
  protected readonly chartOptions = computed<ChartConfiguration<'bar' | 'line'>['options']>(() => {
    const dark = this.themeStore.isDark();
    const muted = dark ? '#9CA3AF' : '#6B7280';
    const grid = dark ? 'rgba(229, 231, 235, 0.12)' : 'rgba(31, 41, 55, 0.10)';
    const surface = dark ? '#16231D' : '#FFFFFF';
    const foreground = dark ? '#E5E7EB' : '#1F2937';
    const border = dark ? '#263A30' : '#DDE5DD';

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, labels: { color: muted, usePointStyle: true, boxWidth: 8 } },
        tooltip: {
          backgroundColor: surface, titleColor: foreground, bodyColor: foreground, borderColor: border, borderWidth: 1, padding: 12,
          callbacks: { label: (context) => `${context.dataset.label}: ${currencyFormatter.format(context.parsed.y ?? 0)}` },
        },
      },
      scales: {
        x: { border: { display: false }, grid: { display: false }, ticks: { color: muted } },
        y: { border: { display: false }, grid: { color: grid, drawTicks: false }, ticks: { color: muted, callback: (value) => this.compactCurrency(Number(value)) } },
      },
    };
  });

  constructor() {
    effect(() => {
      this.themeStore.theme();
      this.chartOptions();
      queueMicrotask(() => this.chartDirective()?.update());
    });
  }

  protected selectPeriod(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active?.[0] as { index?: unknown } | undefined;
    if (typeof active?.index !== 'number') return;
    const point = this.points()[active.index];
    if (point) this.periodSelected.emit(point);
  }

  protected formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  private compactCurrency(value: number): string {
    return value === 0 ? 'R$ 0' : `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value / 1000)}k`;
  }
}
