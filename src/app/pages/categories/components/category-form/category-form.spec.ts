import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialCategory } from '../../../../core/models/financial-category.models';
import { GdSelectOption } from '../../../../shared/forms';

import { CategoryForm } from './category-form';

const typeOptions: readonly GdSelectOption[] = [
  { label: 'Receita', value: 'INCOME' },
  { label: 'Despesa', value: 'EXPENSE' },
];

const category: FinancialCategory = {
  id: 1,
  name: 'Adubo',
  type: 'EXPENSE',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('CategoryForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryForm],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should render name and type fields without scope controls', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nome');
    expect(fixture.nativeElement.textContent).toContain('Tipo');
    expect(fixture.nativeElement.textContent).not.toContain('Escopo da categoria');
    expect(fixture.nativeElement.textContent).not.toContain('Global');
  });

  it('should render only income and expense type options', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.detectChanges();

    expect(optionLabels(fixture.nativeElement)).toEqual([
      'Selecione o tipo',
      'Receita',
      'Despesa',
    ]);
  });

  it('should reject unsupported type values', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    const submitted: unknown[] = [];
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    fixture.detectChanges();

    setInput(fixture.nativeElement, 'Adubo');
    setSelect(fixture.nativeElement, 'TRANSFER');
    submitForm(fixture.nativeElement);
    fixture.detectChanges();

    expect(submitted).toEqual([]);
  });

  it('should validate required fields', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.detectChanges();

    submitForm(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Informe o nome da categoria.');
    expect(fixture.nativeElement.textContent).toContain('Selecione o tipo da categoria.');
  });

  it('should emit valid submit payload', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    const submitted: unknown[] = [];
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    fixture.detectChanges();

    setInput(fixture.nativeElement, 'Adubo');
    setSelect(fixture.nativeElement, 'EXPENSE');
    submitForm(fixture.nativeElement);

    expect(submitted).toEqual([{ name: 'Adubo', type: 'EXPENSE' }]);
  });

  it('should fill the form for editing', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement).value).toBe('Adubo');
    expect(selectedOptionLabel(fixture.nativeElement)).toBe('Despesa');
  });

  it('should emit cancel when not submitting', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    const cancelled = vi.fn();
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Cancelar')?.click();

    expect(cancelled).toHaveBeenCalled();
  });

  it('should disable actions while loading', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('submitting', true);
    fixture.componentRef.setInput('typeOptions', typeOptions);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Cancelar')?.disabled).toBe(true);
    expect(findButton(fixture.nativeElement, 'Salvar')?.disabled).toBe(true);
  });
});

function getInput(root: HTMLElement): HTMLInputElement {
  return root.querySelector('gd-input input') as HTMLInputElement;
}

function getSelect(root: HTMLElement): HTMLSelectElement {
  return root.querySelector('gd-select select') as HTMLSelectElement;
}

function setInput(root: HTMLElement, value: string): void {
  const input = getInput(root);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(root: HTMLElement, value: string): void {
  const select = getSelect(root);
  const option = Array.from(select.options).find((item) => item.value.includes(value));
  select.selectedIndex = option?.index ?? 0;
  select.dispatchEvent(new Event('change'));
}

function optionLabels(root: HTMLElement): string[] {
  return Array.from(getSelect(root).options).map((option) => option.textContent?.trim() ?? '');
}

function selectedOptionLabel(root: HTMLElement): string {
  const select = getSelect(root);
  return select.options[select.selectedIndex]?.textContent?.trim() ?? '';
}

function submitForm(root: HTMLElement): void {
  (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
