import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { Farm } from '../../../../core/models/farm.models';

import { FarmForm } from './farm-form';

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: '123',
  city: 'Barra Mansa',
  state: 'RJ',
  totalArea: 1500.5,
  productionType: 'AGRICULTURE',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('FarmForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmForm],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should mark required fields when submitting an invalid form', () => {
    const fixture = TestBed.createComponent(FarmForm);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe o nome da fazenda.');
  });

  it('should normalize and emit create payload', () => {
    const fixture = TestBed.createComponent(FarmForm);
    const submitted: unknown[] = [];
    fixture.componentRef.setInput('open', true);
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    fixture.detectChanges();

    setInput(fixture.nativeElement, '#farm-name', ' Fazenda Nova ');
    setInput(fixture.nativeElement, '#farm-state', 'rj');
    setInput(fixture.nativeElement, '#farm-total-area', '10.5');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    expect(submitted).toEqual([
      {
        name: 'Fazenda Nova',
        document: null,
        city: null,
        state: 'RJ',
        totalArea: 10.5,
        productionType: null,
      },
    ]);
  });

  it('should fill the form for editing', () => {
    const fixture = TestBed.createComponent(FarmForm);
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, '#farm-name').value).toBe(
      'Fazenda Boa Safra',
    );
    expect(getInput(fixture.nativeElement, '#farm-state').value).toBe(
      'RJ',
    );
  });
});

function getInput(root: HTMLElement, selector: string): HTMLInputElement {
  const indexes: Record<string, number> = {
    '#farm-name': 0,
    '#farm-document': 1,
    '#farm-city': 2,
    '#farm-state': 3,
    '#farm-total-area': 4,
  };

  return root.querySelectorAll<HTMLInputElement>('gd-input input')[indexes[selector]];
}

function setInput(root: HTMLElement, selector: string, value: string): void {
  const input = getInput(root, selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
