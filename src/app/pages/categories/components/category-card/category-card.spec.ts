import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialCategory } from '../../../../core/models/financial-category.models';

import { CategoryCard } from './category-card';

const category: FinancialCategory = {
  id: 1,
  name: 'Venda de leite',
  type: 'INCOME',
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  isDefault: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('CategoryCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should render category data', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Venda de leite');
    expect(fixture.nativeElement.textContent).toContain('Receita');
    expect(fixture.nativeElement.textContent).toContain('Ativa');
    expect(fixture.nativeElement.textContent).toContain('Fazenda');
  });

  it('should render global badge', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', {
      ...category,
      farmId: null,
      farmName: null,
      isDefault: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Global');
  });

  it('should render expense type as danger badge', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', { ...category, type: 'EXPENSE' });
    fixture.detectChanges();

    const badge = findBadge(fixture.nativeElement, 'Despesa');

    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('border-danger');
  });

  it('should render inactive status as danger badge', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', { ...category, status: 'INACTIVE' });
    fixture.detectChanges();

    const badge = findBadge(fixture.nativeElement, 'Inativa');

    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('border-danger');
  });

  it('should emit actions when permitted', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    const edited = vi.fn();
    const deleted = vi.fn();
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canDelete', true);
    fixture.componentInstance.editRequested.subscribe(edited);
    fixture.componentInstance.deleteRequested.subscribe(deleted);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Editar')?.click();
    findButton(fixture.nativeElement, 'Inativar')?.click();

    expect(edited).toHaveBeenCalledWith(category);
    expect(deleted).toHaveBeenCalledWith(category);
  });

  it('should hide actions without permission', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Editar')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Inativar')).toBeUndefined();
  });
});

function findBadge(root: HTMLElement, label: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll('gd-badge span')).find(
    (badge) => badge.textContent?.trim() === label,
  ) as HTMLElement | undefined;
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
