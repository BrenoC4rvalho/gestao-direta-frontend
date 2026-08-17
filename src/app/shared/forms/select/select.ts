import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { FieldError } from '../field-error/field-error';
import { GdFormControl, GdSelectOption } from '../forms.types';
import { Tooltip } from '../../ui/tooltip/tooltip';

@Component({
  selector: 'gd-select',
  imports: [FieldError, LucideDynamicIcon, ReactiveFormsModule, Tooltip],
  templateUrl: './select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<GdFormControl>();
  readonly options = input.required<readonly GdSelectOption[]>();
  readonly placeholder = input('Selecione uma opção');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly hint = input<string | null>(null);
  readonly errorMessage = input<string | null>(null);
  readonly labelTooltip = input<string | null>(null);
  readonly labelTooltipAriaLabel = input<string | null>(null);

  protected hintId(): string {
    return `${this.id()}-hint`;
  }

  protected errorId(): string {
    return `${this.id()}-error`;
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
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-60',
      this.showError()
        ? 'border-danger bg-surface text-text-primary focus-visible:outline-danger'
        : 'border-border bg-surface text-text-primary focus-visible:outline-primary',
    ].join(' ');
  }
}
