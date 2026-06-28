import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ListFilters, ListFiltersConfig } from './list-filters';

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
    search: { placeholder: 'Buscar usuário' },
    textFields: [{ key: 'document', label: 'Documento', placeholder: 'CPF ou CNPJ' }],
    selects: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Todos', value: null },
          { label: 'Ativo', value: 'ACTIVE' },
        ],
      },
    ],
  };
  readonly changes: Record<string, string | null>[] = [];
  clearCount = 0;

  filtersChange(filters: Record<string, string | null>): void {
    this.changes.push(filters);
  }

  clear(): void {
    this.clearCount += 1;
  }
}

describe('ListFilters', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFiltersHost],
    }).compileComponents();
  });

  it('should render configured search, text fields and selects', () => {
    const fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;

    expect(text).toContain('Buscar');
    expect(text).toContain('Documento');
    expect(text).toContain('Status');
    expect(inputs.length).toBe(2);
    expect(selects.length).toBe(1);
  });

  it('should debounce text field changes', async () => {
    const fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('#filter-search') as HTMLInputElement;
    search.value = 'maria';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await wait(99);
    expect(fixture.componentInstance.changes.length).toBe(0);

    await wait(1);
    expect(fixture.componentInstance.changes).toEqual([
      { search: 'maria', document: null, status: null },
    ]);
  });

  it('should emit select changes immediately', () => {
    const fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#filter-status') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([
      { search: null, document: null, status: 'ACTIVE' },
    ]);
  });

  it('should keep clear button disabled without active filters', () => {
    const fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.textContent).toContain('Limpar filtros');
    expect(button.disabled).toBe(true);
  });

  it('should reset fields and emit filtersChange and clear when clearing', async () => {
    const fixture = TestBed.createComponent(ListFiltersHost);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector('#filter-search') as HTMLInputElement;
    search.value = ' maria ';
    search.dispatchEvent(new Event('input'));
    await wait(100);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(search.value).toBe('');
    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      search: null,
      document: null,
      status: null,
    });
    expect(fixture.componentInstance.clearCount).toBe(1);
  });
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

