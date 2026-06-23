import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { Card } from '../../../../shared/ui';

export type SummaryCardTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

@Component({
  selector: 'gd-summary-card',
  imports: [Card, LucideDynamicIcon],
  templateUrl: './summary-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryCard {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly helper = input.required<string>();
  readonly icon = input.required<string>();
  readonly tone = input<SummaryCardTone>('neutral');

  protected toneClasses(): string {
    const tones: Record<SummaryCardTone, string> = {
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      warning: 'bg-warning/10 text-amber-700 dark:text-amber-300',
      info: 'bg-info/10 text-info',
      neutral: 'bg-highlight-soft text-primary',
    };

    return tones[this.tone()];
  }
}
