import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { passwordRequirements } from '../password-policy';

@Component({
  selector: 'gd-password-requirements',
  imports: [LucideDynamicIcon],
  templateUrl: './password-requirements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRequirements {
  readonly control = input.required<AbstractControl>();
  private readonly passwordValue = signal<unknown>('');
  protected readonly requirements = computed(() => passwordRequirements(this.passwordValue()));

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      this.passwordValue.set(control.value);

      const subscription = control.valueChanges.subscribe((value) => this.passwordValue.set(value));
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
