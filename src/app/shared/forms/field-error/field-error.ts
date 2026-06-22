import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'gd-field-error',
  imports: [LucideDynamicIcon],
  templateUrl: './field-error.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  readonly id = input<string | null>(null);
  readonly message = input<string | null | undefined>(null);
}
