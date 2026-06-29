import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'warning'
  | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'gd-button',
  templateUrl: './button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly iconOnly = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly title = input<string | null>(null);

  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  protected readonly buttonClasses = computed(() =>
    [
      'inline-flex items-center justify-center gap-2 rounded-control font-medium',
      'transition-all duration-200 ease-out active:scale-[0.98]',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
      this.fullWidth() ? 'w-full' : '',
      this.sizeClasses(),
      this.variantClasses(),
    ].join(' '),
  );

  private sizeClasses(): string {
    if (this.iconOnly()) {
      const sizes: Record<ButtonSize, string> = {
        sm: 'size-9 p-0 text-sm',
        md: 'size-10 p-0 text-sm',
        lg: 'size-11 p-0 text-base',
      };

      return sizes[this.size()];
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'min-h-9 px-3 text-sm',
      md: 'min-h-10 px-4 text-sm',
      lg: 'min-h-11 px-5 text-base',
    };

    return sizes[this.size()];
  }

  private variantClasses(): string {
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary',
      secondary:
        'bg-accent/15 text-primary hover:bg-accent/25 focus-visible:outline-primary',
      outline:
        'border border-border bg-surface text-text-primary hover:bg-background focus-visible:outline-primary',
      ghost: 'bg-transparent text-text-muted hover:bg-accent/10 hover:text-primary focus-visible:outline-primary',
      danger: 'bg-danger text-white hover:bg-red-700 focus-visible:outline-danger',
      warning: 'bg-warning text-white hover:bg-amber-600 focus-visible:outline-warning',
      success: 'bg-success text-white hover:bg-green-700 focus-visible:outline-success',
    };

    return variants[this.variant()];
  }
}
