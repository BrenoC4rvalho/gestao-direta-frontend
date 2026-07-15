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

  it('should render category list item data', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Venda de leite');
    expect(fixture.nativeElement.textContent).toContain('Receita');
    expect(fixture.nativeElement.textContent).toContain('Ativa');
    const article = fixture.nativeElement.querySelector('article') as HTMLElement;

    expect(article).toBeTruthy();
    expect(article.className).toContain('md:grid-cols');
    expect(fixture.nativeElement.querySelector('gd-card')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Fazenda Boa Safra');
  });

  it('should render unknown type as neutral fallback text', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', { ...category, type: 'OTHER' });
    fixture.detectChanges();

    const badge = findBadge(fixture.nativeElement, 'OTHER');

    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('border-border');
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

  it('should emit edit action when permitted', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    const edited = vi.fn();
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentInstance.editRequested.subscribe(edited);
    fixture.detectChanges();

    const editButton = findButton(fixture.nativeElement, 'Editar categoria');

    expect(editButton?.getAttribute('aria-label')).toBe('Editar categoria');
    expect(editButton?.getAttribute('title')).toBe('Editar categoria');
    expect(editButton?.querySelector('svg[lucideIcon="pencil"]')).toBeTruthy();
    expect(editButton?.textContent?.trim()).toBe('');
    editButton?.click();

    expect(edited).toHaveBeenCalledWith(category);
    expect(findButton(fixture.nativeElement, 'Inativar')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
  });

  it('should hide actions without permission', () => {
    const fixture = TestBed.createComponent(CategoryCard);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Editar categoria')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Inativar')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Ativar')).toBeUndefined();
  });
});

function findBadge(root: HTMLElement, label: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll('gd-badge span')).find(
    (badge) => badge.textContent?.trim() === label,
  ) as HTMLElement | undefined;
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
  );
}
