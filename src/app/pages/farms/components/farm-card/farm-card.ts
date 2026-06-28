import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Farm } from '../../../../core/models/farm.models';
import { DocumentFormatPipe } from '../../../../shared/pipes/document-format.pipe';
import { Badge, BadgeVariant, Button, Card } from '../../../../shared/ui';

@Component({
  selector: 'gd-farm-card',
  imports: [Badge, Button, Card, DocumentFormatPipe],
  templateUrl: './farm-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FarmCard {
  readonly farm = input.required<Farm>();
  readonly canEdit = input(false);
  readonly editRequested = output<Farm>();

  private readonly areaFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  });

  private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  });

  protected editFarm(): void {
    this.editRequested.emit(this.farm());
  }

  protected location(): string {
    const farm = this.farm();

    if (farm.city && farm.state) {
      return `${farm.city}/${farm.state}`;
    }

    return farm.city ?? farm.state ?? 'Localidade não informada';
  }

  protected productionTypeLabel(): string {
    const type = this.farm().productionType;

    if (!type) {
      return 'Não informado';
    }

    const labels: Record<string, string> = {
      AGRICULTURE: 'Agricultura',
      LIVESTOCK: 'Pecuária',
      MIXED: 'Mista',
      OTHER: 'Outra',
    };

    return labels[type] ?? type;
  }

  protected statusLabel(): string {
    const status = this.farm().status;
    const labels: Record<string, string> = {
      ACTIVE: 'Ativa',
      INACTIVE: 'Inativa',
    };

    return labels[status] ?? status;
  }

  protected statusVariant(): BadgeVariant {
    if (this.farm().status === 'ACTIVE') {
      return 'success';
    }

    if (this.farm().status === 'INACTIVE') {
      return 'neutral';
    }

    return 'info';
  }

  protected areaLabel(): string {
    const area = this.farm().totalArea;
    return area === null ? 'Não informada' : `${this.areaFormatter.format(area)} ha`;
  }

  protected updatedAtLabel(): string {
    const date = new Date(this.farm().updatedAt);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : this.dateFormatter.format(date);
  }
}
