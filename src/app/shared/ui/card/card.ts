import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CardVariant = 'default' | 'elevated' | 'outlined';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'gd-card',
  templateUrl: './card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly variant = input<CardVariant>('default');
  readonly padding = input<CardPadding>('md');

  protected readonly cardClasses = computed(() =>
    [
      'rounded-app bg-surface text-text-primary',
      this.variantClasses(),
      this.paddingClasses(),
    ].join(' '),
  );

  private variantClasses(): string {
    const variants: Record<CardVariant, string> = {
      default: 'border border-border',
      elevated: 'border border-border shadow-soft',
      outlined: 'border border-primary/30',
    };

    return variants[this.variant()];
  }

  private paddingClasses(): string {
    const paddings: Record<CardPadding, string> = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    return paddings[this.padding()];
  }
}
