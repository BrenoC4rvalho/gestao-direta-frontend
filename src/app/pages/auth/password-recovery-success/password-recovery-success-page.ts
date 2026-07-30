import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../../shared/ui';

@Component({
  selector: 'gd-password-recovery-success-page',
  imports: [Button, RouterLink],
  templateUrl: './password-recovery-success-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoverySuccessPage {}
