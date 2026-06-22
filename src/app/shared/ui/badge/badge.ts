import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'gd-badge',
  templateUrl: './badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>('default');
  readonly size = input<BadgeSize>('md');

  protected readonly badgeClasses = computed(() =>
    [
      'inline-flex w-fit items-center rounded-full border font-medium',
      this.sizeClasses(),
      this.variantClasses(),
    ].join(' '),
  );

  private sizeClasses(): string {
    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return sizes[this.size()];
  }

  private variantClasses(): string {
    const variants: Record<BadgeVariant, string> = {
      default: 'border-primary/20 bg-primary/10 text-primary',
      success: 'border-success/20 bg-success/10 text-success',
      warning: 'border-warning/25 bg-warning/10 text-amber-700 dark:text-amber-300',
      danger: 'border-danger/20 bg-danger/10 text-danger',
      info: 'border-info/20 bg-info/10 text-info',
      neutral: 'border-border bg-background text-text-muted',
    };

    return variants[this.variant()];
  }
}
