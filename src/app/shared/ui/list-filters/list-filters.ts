import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, merge } from 'rxjs';

import { GdSelectOption } from '../../forms/forms.types';
import { Input } from '../../forms/input/input';
import { Select } from '../../forms/select/select';
import { Button } from '../button/button';

export interface ListFilterTextField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface ListFilterSelectOption {
  label: string;
  value: string | null;
}

export interface ListFilterSelect {
  key: string;
  label: string;
  placeholder?: string;
  options: readonly ListFilterSelectOption[];
}

export interface ListFiltersConfig {
  search?: {
    key?: string;
    label?: string;
    placeholder?: string;
  };
  textFields?: readonly ListFilterTextField[];
  selects?: readonly ListFilterSelect[];
}

type FilterControls = Record<string, FormControl<string | null>>;
type FilterValues = Record<string, string | null>;

@Component({
  selector: 'gd-list-filters',
  imports: [Button, Input, ReactiveFormsModule, Select],
  templateUrl: './list-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFilters implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly config = input.required<ListFiltersConfig>();
  readonly debounceMs = input(300);
  readonly filtersChange = output<FilterValues>();
  readonly clear = output<void>();

  protected readonly controls: FilterControls = {};
  protected readonly hasActiveFilters = signal(false);

  protected readonly searchConfig = computed(() => this.config().search ?? null);
  protected readonly textFields = computed(() => this.config().textFields ?? []);
  protected readonly selects = computed(() => this.config().selects ?? []);

  ngOnInit(): void {
    this.initializeControls();

    const textControls = this.textControlKeys()
      .map((key) => this.controls[key]?.valueChanges)
      .filter((changes) => changes !== undefined);
    const selectControls = this.selects()
      .map((select) => this.controls[select.key]?.valueChanges)
      .filter((changes) => changes !== undefined);

    if (textControls.length > 0) {
      merge(...textControls)
        .pipe(debounceTime(this.debounceMs()), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.emitFilters());
    }

    if (selectControls.length > 0) {
      merge(...selectControls)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.emitFilters());
    }
  }

  protected searchKey(): string {
    return this.searchConfig()?.key ?? 'search';
  }

  protected control(key: string): FormControl<string | null> {
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

    this.emitFilters();
    this.clear.emit();
  }

  private emitFilters(): void {
    const filters: FilterValues = {};

    for (const key of this.controlKeys()) {
      filters[key] = this.normalizeValue(this.controls[key].value);
    }

    this.hasActiveFilters.set(
      Object.values(filters).some((value) => value !== null),
    );
    this.filtersChange.emit(filters);
  }

  private initializeControls(): void {
    for (const key of this.controlKeys()) {
      this.controls[key] = new FormControl<string | null>(null);
    }
  }

  private controlKeys(): string[] {
    return [
      ...(this.searchConfig() ? [this.searchKey()] : []),
      ...this.textFields().map((field) => field.key),
      ...this.selects().map((select) => select.key),
    ];
  }

  private textControlKeys(): string[] {
    return [
      ...(this.searchConfig() ? [this.searchKey()] : []),
      ...this.textFields().map((field) => field.key),
    ];
  }

  private normalizeValue(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }
}
