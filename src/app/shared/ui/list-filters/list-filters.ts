import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideFilter, LucideSearch, LucideX } from '@lucide/angular';

import { GdSelectOption } from '../../forms/forms.types';
import { GdInputType } from '../../forms/input/input';
import { Input } from '../../forms/input/input';
import { Select } from '../../forms/select/select';

export interface ListFilterOption {
  label: string;
  value: string | null;
}

export interface ListFilterTextField {
  key: string;
  label: string;
  placeholder?: string;
  type?: Extract<GdInputType, 'date' | 'search' | 'text'>;
  error?: string | null;
}

export type ListFilterSelectOption = ListFilterOption;

export interface ListFilterSelect {
  key: string;
  label: string;
  placeholder?: string;
  options: readonly ListFilterSelectOption[];
}

export type ListQuickFilter = ListFilterOption;

export interface ListQuickFilterGroup {
  key: string;
  label: string;
  multiple?: boolean;
  options: readonly ListQuickFilter[];
  error?: string | null;
  emptyMessage?: string | null;
}

export interface ListFiltersConfig {
  title?: string;
  subtitle?: string | null;
  search?: {
    key?: string;
    label?: string;
    placeholder?: string;
    type?: Extract<GdInputType, 'date' | 'search' | 'text'>;
    error?: string | null;
  };
  textFields?: readonly ListFilterTextField[];
  selects?: readonly ListFilterSelect[];
  quickFilters?: readonly ListQuickFilterGroup[];
}

type FilterControls = Record<string, FormControl<string | null>>;
export type ListFilterValues = Record<string, string | string[] | null>;

@Component({
  selector: 'gd-list-filters',
  imports: [Input, LucideFilter, LucideSearch, LucideX, ReactiveFormsModule, Select],
  templateUrl: './list-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFilters {
  readonly config = input.required<ListFiltersConfig>();
  readonly debounceMs = input(300);
  readonly quickFiltersApplyOnChange = input(false);
  readonly filtersChange = output<ListFilterValues>();
  readonly clear = output<void>();

  protected readonly controls: FilterControls = {};
  protected readonly selectedQuickFilters = signal<Record<string, readonly string[]>>({});
  private readonly appliedControlValues = signal<Record<string, string | null>>({});

  protected readonly title = computed(() => this.config().title ?? 'Filtros');
  protected readonly subtitle = computed(() => this.config().subtitle ?? null);
  protected readonly searchConfig = computed(() => this.config().search ?? null);
  protected readonly textFields = computed(() => this.config().textFields ?? []);
  protected readonly selects = computed(() => this.config().selects ?? []);
  protected readonly quickFilters = computed(() => this.config().quickFilters ?? []);

  protected searchKey(): string {
    return this.searchConfig()?.key ?? 'search';
  }

  protected control(key: string): FormControl<string | null> {
    this.controls[key] ??= new FormControl<string | null>(null);
    return this.controls[key];
  }

  protected selectOptions(select: ListFilterSelect): readonly GdSelectOption[] {
    return select.options
      .filter((option): option is ListFilterSelectOption & { value: string } => option.value !== null)
      .map((option) => ({ label: option.label, value: option.value }));
  }

  protected selectPlaceholder(select: ListFilterSelect): string {
    return (
      select.options.find((option) => option.value === null)?.label ??
      select.placeholder ??
      'Todos'
    );
  }

  protected clearFilters(): void {
    for (const control of Object.values(this.controls)) {
      control.setValue(null, { emitEvent: false });
    }

    this.selectedQuickFilters.set({});
    const controlValues = this.currentControlValues();
    this.appliedControlValues.set(controlValues);
    this.emitFilters(controlValues);
    this.clear.emit();
  }

  protected applyFilters(): void {
    const controlValues = this.currentControlValues();
    this.appliedControlValues.set(controlValues);
    this.emitFilters(controlValues);
  }

  protected toggleQuickFilter(group: ListQuickFilterGroup, filter: ListQuickFilter): void {
    const current = this.selectedQuickFilters()[group.key] ?? [];
    const nextSelection = this.nextQuickFilterSelection(group, filter, current);

    this.selectedQuickFilters.update((selected) => ({
      ...selected,
      [group.key]: nextSelection,
    }));

    const control = this.controls[group.key];
    if (control && !group.multiple) {
      control.setValue(nextSelection[0] ?? null, { emitEvent: false });
    }

    if (this.quickFiltersApplyOnChange()) {
      this.emitFilters(this.appliedControlValues());
    }
  }

  protected isQuickFilterActive(group: ListQuickFilterGroup, filter: ListQuickFilter): boolean {
    const selected = this.selectedQuickFilters()[group.key] ?? [];

    if (filter.value === null) {
      return selected.length === 0;
    }

    return selected.includes(filter.value);
  }

  protected quickFilterChipClasses(active: boolean): string {
    return [
      'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium shadow-sm transition-all duration-200 ease-out',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary',
      active
        ? 'border-primary bg-primary text-white hover:bg-primary-hover'
        : 'border-border bg-surface text-text-primary hover:border-primary/50 hover:text-primary',
    ].join(' ');
  }

  protected hasActiveFilters(): boolean {
    return Object.values(this.currentFilters()).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== null,
    );
  }

  private emitFilters(controlValues: Record<string, string | null> = this.currentControlValues()): void {
    this.filtersChange.emit(this.currentFilters(controlValues));
  }

  private currentFilters(controlValues: Record<string, string | null> = this.currentControlValues()): ListFilterValues {
    const filters: ListFilterValues = {};

    for (const key of this.controlKeys()) {
      filters[key] = controlValues[key] ?? null;
    }

    for (const group of this.quickFilters()) {
      const selected = this.selectedQuickFilters()[group.key] ?? [];

      if (selected.length === 0) {
        filters[group.key] = filters[group.key] ?? null;
        continue;
      }

      filters[group.key] = group.multiple ? [...selected] : selected[0];
    }

    return filters;
  }

  private currentControlValues(): Record<string, string | null> {
    return this.controlKeys().reduce<Record<string, string | null>>((filters, key) => {
      filters[key] = this.normalizeValue(this.controls[key]?.value ?? null);
      return filters;
    }, {});
  }

  private controlKeys(): string[] {
    return [
      ...(this.searchConfig() ? [this.searchKey()] : []),
      ...this.textFields().map((field) => field.key),
      ...this.selects().map((select) => select.key),
    ];
  }

  private normalizeValue(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private nextQuickFilterSelection(
    group: ListQuickFilterGroup,
    filter: ListQuickFilter,
    current: readonly string[],
  ): readonly string[] {
    if (filter.value === null) {
      return [];
    }

    if (!group.multiple) {
      return [filter.value];
    }

    return current.includes(filter.value)
      ? current.filter((value) => value !== filter.value)
      : [...current, filter.value];
  }
}
