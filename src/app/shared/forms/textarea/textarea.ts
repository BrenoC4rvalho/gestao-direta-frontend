import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { FieldError } from '../field-error/field-error';
import { GdFormControl } from '../forms.types';

@Component({
  selector: 'gd-textarea',
  imports: [FieldError, ReactiveFormsModule],
  templateUrl: './textarea.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Textarea {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<GdFormControl>();
  readonly placeholder = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly rows = input(4);
  readonly hint = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly maxlength = input<number | null>(null);

  protected hintId(): string {
    return `${this.id()}-hint`;
  }

  protected errorId(): string {
    return `${this.id()}-error`;
  }

  protected counterId(): string {
    return `${this.id()}-counter`;
  }

  protected showError(): boolean {
    const control = this.control();
    return control.invalid && (control.touched || control.dirty);
  }

  protected describedBy(): string | null {
    const ids: string[] = [];

    if (this.showError()) {
      ids.push(this.errorId());
    } else if (this.hint()) {
      ids.push(this.hintId());
    }

    if (this.maxlength()) {
      ids.push(this.counterId());
    }

    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected fieldClasses(): string {
    return [
      'w-full resize-y rounded-control border px-3 py-2 text-sm leading-6 transition-colors',
      'placeholder:text-text-muted/75',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-60',
      this.readonly() ? 'read-only:cursor-default' : '',
      this.showError()
        ? 'border-danger bg-surface text-text-primary focus-visible:outline-danger'
        : 'border-border bg-surface text-text-primary focus-visible:outline-primary',
    ].join(' ');
  }

  protected valueLength(): number {
    const value = this.control().value;
    return typeof value === 'string' ? value.length : 0;
  }
}
