import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { Farm } from '../../../../core/models/farm.models';

import { FarmForm } from './farm-form';

const farm: Farm = {
  id: 1,
  name: 'Fazenda Boa Safra',
  document: '12345678900',
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

  it('should render document type options', () => {
    const fixture = createForm();
    const select = getDocumentTypeSelect(fixture.nativeElement);

    expect(fixture.nativeElement.textContent).toContain('Tipo de documento');
    expect(select.textContent).toContain('CPF');
    expect(select.textContent).toContain('CNPJ');
    expect(select.options[select.selectedIndex]?.textContent?.trim()).toBe('CNPJ');
  });

  it('should mark required fields when submitting an invalid form', () => {
    const fixture = createForm();

    submit(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe o nome da fazenda.');
  });

  it('should mask CPF documents with 11 digits', () => {
    const fixture = createForm();

    setDocumentType(fixture.nativeElement, 'CPF');
    setInput(fixture.nativeElement, '#farm-document', '12345678900123');
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, '#farm-document').value).toBe('123.456.789-00');
  });

  it('should mask CNPJ documents with 14 digits', () => {
    const fixture = createForm();

    setInput(fixture.nativeElement, '#farm-document', '12345678000190123');
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, '#farm-document').value).toBe('12.345.678/0001-90');
  });

  it('should normalize and emit create payload with document digits only', () => {
    const fixture = createForm();
    const submitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));

    setInput(fixture.nativeElement, '#farm-name', ' Fazenda Nova ');
    setInput(fixture.nativeElement, '#farm-document', '12.345.678/0001-90');
    setInput(fixture.nativeElement, '#farm-state', 'rj');
    setInput(fixture.nativeElement, '#farm-total-area', '10.5');
    submit(fixture.nativeElement);

    expect(submitted).toEqual([
      {
        name: 'Fazenda Nova',
        document: '12345678000190',
        city: null,
        state: 'RJ',
        totalArea: 10.5,
        productionType: null,
      },
    ]);
    expect(submitted[0]).not.toHaveProperty('documentType');
  });

  it('should emit null for an empty document', () => {
    const fixture = createForm();
    const submitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));

    setInput(fixture.nativeElement, '#farm-name', 'Fazenda Nova');
    submit(fixture.nativeElement);

    expect(submitted).toEqual([
      {
        name: 'Fazenda Nova',
        document: null,
        city: null,
        state: null,
        totalArea: null,
        productionType: null,
      },
    ]);
  });

  it('should fill the form and infer CPF for editing an 11 digit document', () => {
    const fixture = TestBed.createComponent(FarmForm);
    fixture.componentRef.setInput('farm', farm);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, '#farm-name').value).toBe('Fazenda Boa Safra');
    expect(getInput(fixture.nativeElement, '#farm-document').value).toBe('123.456.789-00');
    expect(getSelectedDocumentType(fixture.nativeElement)).toBe('CPF');
    expect(getInput(fixture.nativeElement, '#farm-state').value).toBe('RJ');
  });

  it('should infer CNPJ for editing a 14 digit document', () => {
    const fixture = TestBed.createComponent(FarmForm);
    fixture.componentRef.setInput('farm', { ...farm, document: '12345678000190' });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, '#farm-document').value).toBe('12.345.678/0001-90');
    expect(getSelectedDocumentType(fixture.nativeElement)).toBe('CNPJ');
  });

  it('should validate incomplete CPF and CNPJ documents', () => {
    const fixture = createForm();

    setInput(fixture.nativeElement, '#farm-name', 'Fazenda Nova');
    setDocumentType(fixture.nativeElement, 'CPF');
    setInput(fixture.nativeElement, '#farm-document', '123');
    submit(fixture.nativeElement);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CPF deve conter 11 dígitos.');

    setDocumentType(fixture.nativeElement, 'CNPJ');
    submit(fixture.nativeElement);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CNPJ deve conter 14 dígitos.');
  });
});

function createForm() {
  const fixture = TestBed.createComponent(FarmForm);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return fixture;
}

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

function getDocumentTypeSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelectorAll<HTMLSelectElement>('gd-select select')[0];
}

function setDocumentType(root: HTMLElement, value: 'CPF' | 'CNPJ'): void {
  const select = getDocumentTypeSelect(root);
  const option = Array.from(select.options).find((item) => item.textContent?.trim() === value);

  if (!option) {
    throw new Error(`Option not found: ${value}`);
  }

  select.value = option.value;
  select.dispatchEvent(new Event('change'));
}

function getSelectedDocumentType(root: HTMLElement): string | undefined {
  const select = getDocumentTypeSelect(root);
  return select.options[select.selectedIndex]?.textContent?.trim();
}

function submit(root: HTMLElement): void {
  (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
}
