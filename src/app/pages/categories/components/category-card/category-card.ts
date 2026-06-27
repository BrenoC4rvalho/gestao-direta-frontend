import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  FinancialCategory,
  FinancialCategoryStatus,
  FinancialCategoryType,
  isGlobalCategory,
} from '../../../../core/models/financial-category.models';
import { Badge, BadgeVariant, Button, Card } from '../../../../shared/ui';

@Component({
  selector: 'gd-category-card',
  imports: [Badge, Button, Card],
  templateUrl: './category-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCard {
  readonly category = input.required<FinancialCategory>();
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  readonly editRequested = output<FinancialCategory>();
  readonly deleteRequested = output<FinancialCategory>();

  protected editCategory(): void {
    this.editRequested.emit(this.category());
  }

  protected deleteCategory(): void {
    this.deleteRequested.emit(this.category());
  }

  protected typeLabel(type: FinancialCategoryType = this.category().type): string {
    const labels: Record<string, string> = {
      INCOME: 'Receita',
      EXPENSE: 'Despesa',
      GLOBAL: 'Global',
    };

    return labels[type] ?? type;
  }

  protected typeVariant(): BadgeVariant {
    const variants: Record<string, BadgeVariant> = {
      INCOME: 'success',
      EXPENSE: 'warning',
      GLOBAL: 'info',
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
    return this.category().status === 'ACTIVE' ? 'success' : 'neutral';
  }

  protected originLabel(): string {
    return isGlobalCategory(this.category()) ? 'Global' : 'Fazenda';
  }

  protected originVariant(): BadgeVariant {
    return isGlobalCategory(this.category()) ? 'info' : 'default';
  }
}
