import { TestBed } from '@angular/core/testing';

import { Farm } from '../../../../core/models/farm.models';

import { FarmCard } from './farm-card';

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: '12.345.678/0001-90',
  city: 'Ribeirão Preto',
  state: 'SP',
  totalArea: 120,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

describe('FarmCard', () => {
  it('should render farm data and emit selection', async () => {
    await TestBed.configureTestingModule({
      imports: [FarmCard],
    }).compileComponents();

    const fixture = TestBed.createComponent(FarmCard);
    const emitted: Farm[] = [];
    fixture.componentRef.setInput('farm', farm);
    fixture.componentInstance.selectRequested.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Ribeirão Preto/SP');
    expect(text).toContain('Agricultura');
    expect(text).toContain('Ativa');
    expect(text).toContain('120 ha');

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual([farm]);
  });

  it('should show selected state and disable the action', async () => {
    await TestBed.configureTestingModule({
      imports: [FarmCard],
    }).compileComponents();

    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(fixture.nativeElement.textContent).toContain('Selecionada');
    expect(button.disabled).toBe(true);
  });
});
