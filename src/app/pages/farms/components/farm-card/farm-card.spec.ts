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
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmCard],
    }).compileComponents();
  });

  it('should render farm data and emit all available actions', () => {
    const fixture = TestBed.createComponent(FarmCard);
    const selected: Farm[] = [];
    const edited: Farm[] = [];
    const statusChanges: Farm[] = [];
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canManageStatus', true);
    fixture.componentInstance.selectRequested.subscribe((value) => selected.push(value));
    fixture.componentInstance.editRequested.subscribe((value) => edited.push(value));
    fixture.componentInstance.statusChangeRequested.subscribe((value) =>
      statusChanges.push(value),
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Ribeirão Preto/SP');
    expect(text).toContain('Agricultura');
    expect(text).toContain('Ativa');

    clickButton(fixture.nativeElement, 'Selecionar');
    clickButton(fixture.nativeElement, 'Editar');
    clickButton(fixture.nativeElement, 'Inativar');

    expect(selected).toEqual([farm]);
    expect(edited).toEqual([farm]);
    expect(statusChanges).toEqual([farm]);
  });

  it('should show selected state and disable selection', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();

    const selectedButton = findButton(fixture.nativeElement, 'Selecionada');
    expect(selectedButton?.disabled).toBe(true);
  });

  it('should not expose status actions without permission', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Inativar')).toBeUndefined();
  });

  it('should disable selection and offer activation for an inactive farm', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', { ...farm, status: 'INACTIVE' });
    fixture.componentRef.setInput('canManageStatus', true);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Indisponível')?.disabled).toBe(true);
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeTruthy();
  });
});

function clickButton(root: HTMLElement, label: string): void {
  findButton(root, label)?.click();
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
