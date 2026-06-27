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

const removedActions = ['Selecionar', 'Selecionada', 'Indisponível', 'Inativar', 'Ativar'];

describe('FarmCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmCard],
    }).compileComponents();
  });

  it('should render farm data and emit edit action', () => {
    const fixture = TestBed.createComponent(FarmCard);
    const edited: Farm[] = [];
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentInstance.editRequested.subscribe((value) => edited.push(value));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Ribeirão Preto/SP');
    expect(text).toContain('Agricultura');
    expect(text).toContain('Ativa');

    clickButton(fixture.nativeElement, 'Editar');

    expect(edited).toEqual([farm]);
  });

  it('should not render selection or status actions', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    for (const label of removedActions) {
      expect(text).not.toContain(label);
      expect(findButton(fixture.nativeElement, label)).toBeUndefined();
    }
  });

  it('should hide edit action without permission', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', farm);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Editar')).toBeUndefined();
  });

  it('should render inactive status without activation action', () => {
    const fixture = TestBed.createComponent(FarmCard);
    fixture.componentRef.setInput('farm', { ...farm, status: 'INACTIVE' });
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Inativa');
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Indisponível')).toBeUndefined();
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
