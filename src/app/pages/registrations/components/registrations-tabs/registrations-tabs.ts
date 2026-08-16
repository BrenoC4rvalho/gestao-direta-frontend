import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { Button } from '../../../../shared/ui';

@Component({
  selector: 'gd-registrations-tabs',
  imports: [Button, LucideDynamicIcon, RouterLink, RouterLinkActive],
  templateUrl: './registrations-tabs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationsTabs {
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();

  protected emitAction(): void {
    this.action.emit();
  }
}
