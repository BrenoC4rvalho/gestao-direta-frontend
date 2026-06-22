import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../shared/ui';

@Component({
  selector: 'gd-ui-test-page',
  imports: [Badge, Button, Card, EmptyState, ErrorState, Skeleton],
  templateUrl: './ui-test-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiTestPage {
  protected readonly buttonVariants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
  protected readonly buttonSizes = ['sm', 'md', 'lg'] as const;
  protected readonly cardVariants = ['default', 'elevated', 'outlined'] as const;
  protected readonly badgeVariants = ['default', 'success', 'warning', 'danger', 'info', 'neutral'] as const;

  protected visualAction(): void {
    return;
  }
}
