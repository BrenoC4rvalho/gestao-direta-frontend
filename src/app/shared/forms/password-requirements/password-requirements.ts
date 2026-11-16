import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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

  protected requirements() {
    return passwordRequirements(this.control().value);
  }
}
