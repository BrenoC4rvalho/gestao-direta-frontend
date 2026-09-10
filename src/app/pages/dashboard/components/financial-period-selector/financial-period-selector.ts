import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { FinancialHorizonDays } from '../../../../core/models/financial.models';

let nextPeriodSelectorId = 0;

@Component({
  selector: 'gd-financial-period-selector',
  imports: [LucideDynamicIcon],
  templateUrl: './financial-period-selector.html',
  host: {
    class: 'block w-full sm:w-auto',
    '(document:click)': 'handleDocumentClick($event)',
    '(document:keydown.escape)': 'handleEscape($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialPeriodSelector {
  readonly selectedPeriod = input.required<FinancialHorizonDays>();
  readonly periods = input.required<readonly FinancialHorizonDays[]>();
  readonly periodChange = output<FinancialHorizonDays>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');

  protected readonly open = signal(false);
  protected readonly selectedLabel = computed(() => this.periodLabel(this.selectedPeriod()));
  protected readonly menuId = `financial-period-options-${nextPeriodSelectorId++}`;

  protected toggle(): void {
    const willOpen = !this.open();
    this.open.set(willOpen);

    if (willOpen) {
      this.focusSelectedOption();
    }
  }

  protected selectPeriod(period: FinancialHorizonDays): void {
    if (!this.periods().includes(period)) {
      return;
    }

    this.periodChange.emit(period);
    this.close(true);
  }

  protected handleTriggerKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    this.open.set(true);

    const selectedIndex = this.periods().indexOf(this.selectedPeriod());
    const targetIndex = event.key === 'End'
      ? this.periods().length - 1
      : event.key === 'Home'
        ? 0
        : selectedIndex;

    this.focusOption(targetIndex);
  }

  protected handleOptionKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Tab') {
      this.open.set(false);
      return;
    }

    const lastIndex = this.periods().length - 1;
    let targetIndex: number | null = null;

    if (event.key === 'ArrowDown') {
      targetIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === 'ArrowUp') {
      targetIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = lastIndex;
    }

    if (targetIndex === null) {
      return;
    }

    event.preventDefault();
    this.focusOption(targetIndex);
  }

  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.open() || this.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.close(false);
  }

  protected handleEscape(event: Event): void {
    if (!this.open()) {
      return;
    }

    event.preventDefault();
    this.close(true);
  }

  protected periodLabel(period: FinancialHorizonDays): string {
    return `Últimos ${period} dias`;
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);

    if (restoreFocus) {
      queueMicrotask(() => this.trigger()?.nativeElement.focus());
    }
  }

  private focusSelectedOption(): void {
    const selectedIndex = this.periods().indexOf(this.selectedPeriod());
    this.focusOption(selectedIndex);
  }

  private focusOption(index: number): void {
    queueMicrotask(() => this.optionButtons()[index]?.nativeElement.focus());
  }
}
