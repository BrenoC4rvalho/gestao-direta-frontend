import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Farm } from '../../../../core/models/farm.models';
import { Badge, Card } from '../../../../shared/ui';

@Component({
  selector: 'gd-selected-farm-summary-card',
  imports: [Badge, Card],
  templateUrl: './selected-farm-summary-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedFarmSummaryCard {
  readonly farm = input.required<Farm>();

  protected location(): string {
    const farm = this.farm();

    if (farm.city && farm.state) {
      return `${farm.city}/${farm.state}`;
    }

    return farm.city ?? farm.state ?? 'Localidade não informada';
  }

  protected statusLabel(): string {
    return this.farm().status === 'ACTIVE' ? 'Ativa' : 'Inativa';
  }

  protected productionTypeLabel(): string | null {
    const type = this.farm().productionType;

    if (!type) {
      return null;
    }

    const labels: Record<string, string> = {
      AGRICULTURE: 'Agricultura',
      LIVESTOCK: 'Pecuária',
      MIXED: 'Mista',
      OTHER: 'Outra',
    };

    return labels[type] ?? type;
  }
}
