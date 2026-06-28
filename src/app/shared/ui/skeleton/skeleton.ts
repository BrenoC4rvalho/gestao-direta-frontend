import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonRounded = 'sm' | 'md' | 'lg' | 'full';

@Component({
  selector: 'gd-skeleton',
  templateUrl: './skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly rounded = input<SkeletonRounded>('md');

  protected readonly skeletonClasses = computed(() =>
    [
      'animate-pulse bg-border/50 transition-colors duration-200 dark:bg-border/60',
      this.roundedClasses(),
    ].join(' '),
  );

  protected readonly skeletonStyles = computed(() => ({
    width: this.width(),
    height: this.height(),
  }));

  private roundedClasses(): string {
    const rounded: Record<SkeletonRounded, string> = {
      sm: 'rounded-sm',
      md: 'rounded-control',
      lg: 'rounded-app',
      full: 'rounded-full',
    };

    return rounded[this.rounded()];
  }
}
