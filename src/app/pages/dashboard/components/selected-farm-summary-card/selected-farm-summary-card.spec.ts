import { TestBed } from '@angular/core/testing';

import { Farm } from '../../../../core/models/farm.models';

import { SelectedFarmSummaryCard } from './selected-farm-summary-card';

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: null,
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('SelectedFarmSummaryCard', () => {
  it('should render farm data', async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedFarmSummaryCard],
    }).compileComponents();

    const fixture = TestBed.createComponent(SelectedFarmSummaryCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Ribeirão Preto/SP');
    expect(text).toContain('Ativa');
    expect(text).toContain('Agricultura');
  });
});
