import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import {
  FinancialCategory,
  FinancialCategoryStatus,
  FinancialCategoryType,
} from '../../../../core/models/financial-category.models';
import { Badge, BadgeVariant, Button } from '../../../../shared/ui';

@Component({
  selector: 'gd-category-card',
  imports: [Badge, Button, LucideDynamicIcon],
  templateUrl: './category-card.html',
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCard {
  readonly category = input.required<FinancialCategory>();
  readonly canEdit = input(false);

  readonly editRequested = output<FinancialCategory>();

  protected editCategory(): void {
    this.editRequested.emit(this.category());
  }

  protected typeLabel(type: FinancialCategoryType = this.category().type): string {
    const labels: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
    };

    return labels[type] ?? type;
  }

  protected typeVariant(): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      INCOME: 'success',
      EXPENSE: 'danger',
    };

    return variants[this.category().type] ?? 'neutral';
  }

  protected statusLabel(status: FinancialCategoryStatus = this.category().status): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativa',
      INACTIVE: 'Inativa',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(): BadgeVariant {
    return this.category().status === 'ACTIVE' ? 'success' : 'danger';
  }
}
