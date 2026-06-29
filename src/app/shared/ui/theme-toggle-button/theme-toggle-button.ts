import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { ThemeStore } from '../../../core/stores/theme.store';

@Component({
  selector: 'gd-theme-toggle-button',
  imports: [LucideDynamicIcon],
  templateUrl: './theme-toggle-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleButton {
  protected readonly themeStore = inject(ThemeStore);

  protected toggleTheme(): void {
    this.themeStore.toggleTheme();
  }
}
