import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { ListFilterValues, ListFilters, ListFiltersConfig } from './list-filters';

@Component({
  imports: [ListFilters],
  template: `
    <gd-list-filters
      [config]="config"
      [debounceMs]="100"
      (filtersChange)="filtersChange($event)"
      (clear)="clear()"
    />
  `,
})
class ListFiltersHost {
  readonly config: ListFiltersConfig = {
    subtitle: 'Busque por usuário e filtre por status',
    search: { placeholder: 'Buscar usuário' },
    textFields: [{ key: 'document', label: 'Documento', placeholder: 'CPF ou CNPJ' }],
    selects: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todos', value: null },
          { label: 'Ativo', value: 'ACTIVE' },
          { label: 'Inativo', value: 'INACTIVE' },
        ],
      },
    ],
    quickFilters: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todos', value: null },
          { label: 'Ativo', value: 'ACTIVE' },
          { label: 'Inativo', value: 'INACTIVE' },
        ],
      },
      {
        key: 'role',
        label: 'Papel',
        multiple: true,
        options: [
          { label: 'Todos', value: null },
          { label: 'Produtor', value: 'PRODUCER' },
          { label: 'Contador', value: 'ACCOUNTANT' },
        ],
      },
    ],
  };
  readonly changes: ListFilterValues[] = [];
  clearCount = 0;

  filtersChange(filters: ListFilterValues): void {
    this.changes.push(filters);
  }

  clear(): void {
    this.clearCount += 1;
  }
}

describe('ListFilters', () => {
  let fixture: ComponentFixture<ListFiltersHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFiltersHost],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();
  });

  it('should render title, subtitle, fields and icon actions', () => {
    const text = fixture.nativeElement.textContent as string;
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const applyButton = actionButton('Aplicar filtros');
    const clearButton = actionButton('Limpar filtros');

    expect(text).toContain('Filtros');
    expect(text).toContain('Busque por usuário e filtre por status');
    expect(text).toContain('Buscar');
    expect(text).toContain('Documento');
    expect(text).toContain('Status');
    expect(text).not.toContain('Aplicar filtros');
    expect(text).not.toContain('Limpar filtros');
    expect(inputs.length).toBe(2);
    expect(selects.length).toBe(1);
    expect(applyButton).toBeTruthy();
    expect(applyButton?.getAttribute('title')).toBe('Aplicar filtros');
    expect(applyButton?.querySelector('svg')).toBeTruthy();
    expect(clearButton).toBeTruthy();
    expect(clearButton?.getAttribute('title')).toBe('Limpar filtros');
    expect(clearButton?.querySelector('svg')).toBeTruthy();
  });

  it('should not emit automatically when text fields change', async () => {
    const search = input('#filter-search');
    search.value = 'maria';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await wait(120);

    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('should emit normalized current values when applying filters', () => {
    const search = input('#filter-search');
    const document = input('#filter-document');
    const status = select('#filter-status');

    search.value = ' maria ';
    search.dispatchEvent(new Event('input'));
    document.value = ' 123 ';
    document.dispatchEvent(new Event('input'));
    status.selectedIndex = 1;
    status.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes).toEqual([
      { search: 'maria', document: '123', status: 'ACTIVE', role: null },
    ]);
  });

  it('should clear fields, chips and emit clear events', () => {
    input('#filter-search').value = 'maria';
    input('#filter-search').dispatchEvent(new Event('input'));
    clickButton('Ativo');
    fixture.detectChanges();

    clickActionButton('Limpar filtros');
    fixture.detectChanges();

    expect(input('#filter-search').value).toBe('');
    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: null,
      role: null,
    });
    expect(fixture.componentInstance.clearCount).toBe(1);
    expect(button('Todos')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should render quick filter chips', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Filtros rápidos');
    expect(text).toContain('Ativo');
    expect(text).toContain('Produtor');
  });

  it('should apply a single quick filter only when applying filters', () => {
    clickButton('Ativo');

    expect(fixture.componentInstance.changes).toEqual([]);
    expect(button('Ativo')?.getAttribute('aria-pressed')) .toBe('true');
    expect(button('Ativo')?.className).toContain('bg-primary');
    expect(button('Ativo')?.className).toContain('text-white');
    expect(button('Todos')?.className).toContain('border-border');
    expect(button('Todos')?.className).toContain('text-text-primary');
    expect(button('Todos')?.className).not.toContain('bg-highlight-soft');

    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes).toEqual([
      { search: null, document: null, status: 'ACTIVE', role: null },
    ]);
  });

  it('should clear a quick filter group when Todos is clicked', () => {
    clickButton('Ativo');
    clickButton('Todos');

    expect(button('Todos')?.getAttribute('aria-pressed')).toBe('true');

    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: null,
      role: null,
    });
  });

  it('should allow multiple selections when quick filter group is multiple', () => {
    clickButton('Produtor');
    clickButton('Contador');

    expect(fixture.componentInstance.changes).toEqual([]);
    expect(button('Produtor')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('Contador')?.getAttribute('aria-pressed')).toBe('true');

    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: null,
      role: ['PRODUCER', 'ACCOUNTANT'],
    });
  });

  it('should remove a multiple quick filter when clicked again', () => {
    clickButton('Produtor');
    clickButton('Contador');
    clickButton('Produtor');
    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: null,
      role: ['ACCOUNTANT'],
    });
    expect(button('Produtor')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('should keep one selection when quick filter group is single', () => {
    clickButton('Ativo');
    clickButton('Inativo');
    clickActionButton('Aplicar filtros');

    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: 'INACTIVE',
      role: null,
    });
  });

  function input(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  }

  function select(selector: string): HTMLSelectElement {
    return fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
  }

  function clickButton(label: string): void {
    const target = button(label);
    if (!target) {
      throw new Error(`Button not found: ${label}`);
    }

    target.click();
    fixture.detectChanges();
  }

  function clickActionButton(label: string): void {
    const target = actionButton(label);
    if (!target) {
      throw new Error(`Action button not found: ${label}`);
    }

    target.click();
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement | undefined {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.includes(label));
  }

  function actionButton(label: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);
  }
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
