import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { FieldError } from '../field-error/field-error';
import { GdFormControl } from '../forms.types';

export type GdInputType =
  | 'date'
  | 'email'
  | 'number'
  | 'password'
  | 'search'
  | 'tel'
  | 'text'
  | 'url';

@Component({
  selector: 'gd-input',
  imports: [FieldError, LucideDynamicIcon, ReactiveFormsModule],
  templateUrl: './input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Input {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<GdFormControl>();
  readonly placeholder = input('');
  readonly type = input<GdInputType>('text');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly hint = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly min = input<number | null>(null);
  readonly prefix = input<string | null>(null);
  readonly step = input<number | string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected hintId(): string {
    return `${this.id()}-hint`;
  }

  protected errorId(): string {
    return `${this.id()}-error`;
  }

  protected inputType(): GdInputType {
    return this.type() === 'password' && this.passwordVisible() ? 'text' : this.type();
  }

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected showError(): boolean {
    const control = this.control();
    return control.invalid && (control.touched || control.dirty);
  }

  protected describedBy(): string | null {
    if (this.showError()) {
      return this.errorId();
    }

    return this.hint() ? this.hintId() : null;
  }

  protected fieldClasses(): string {
    return [
      'min-h-10 w-full rounded-control border px-3 text-sm transition-colors',
      this.prefix() ? 'pl-11' : '',
      this.type() === 'password' ? 'pr-11' : '',
      'placeholder:text-text-muted/75',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-60',
      this.readonly() ? 'read-only:cursor-default' : '',
      this.showError()
        ? 'border-danger bg-surface text-text-primary focus-visible:outline-danger'
        : 'border-border bg-surface text-text-primary focus-visible:outline-primary',
    ].join(' ');
  }
}
