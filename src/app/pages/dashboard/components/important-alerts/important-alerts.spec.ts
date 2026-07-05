import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { FinancialAlerts } from '../../../../core/models/financial.models';

import { ImportantAlerts } from './important-alerts';

const alerts: FinancialAlerts = {
  farmId: 1,
  overdueBills: [
    {
      transactionId: 101,
      description: 'Boleto fornecedor AgroSul',
      categoryName: 'Insumos',
      amount: 3200,
      dueDate: '2026-07-02',
      daysOverdue: 3,
    },
    {
      transactionId: 102,
      description: 'Parcela oficina trator',
      categoryName: 'Manutenção',
      amount: 1250,
      dueDate: '2026-07-04',
      daysOverdue: 1,
    },
  ],
  dueToday: { count: 1, totalAmount: 1850 },
  dueNext7Days: { count: 5, totalAmount: 7400 },
};

function textContent(fixture: ComponentFixture<ImportantAlerts>): string {
  return (fixture.nativeElement.textContent as string).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
}

describe('ImportantAlerts', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportantAlerts],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should render the title', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    expect(textContent(fixture)).toContain('Alertas importantes');
  });

  it('should render overdue bills one by one', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const items = Array.from(fixture.nativeElement.querySelectorAll('li')) as HTMLElement[];

    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Boleto fornecedor AgroSul');
    expect(items[0].textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 3.200,00');
    expect(items[1].textContent).toContain('Parcela oficina trator');
    expect(items[1].textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 1.250,00');
  });

  it('should render overdue item in the compact two-line layout', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const firstItem = fixture.nativeElement.querySelector('li') as HTMLElement;
    const topLine = firstItem.querySelector('div.flex.items-center.justify-between') as HTMLElement;
    const value = topLine.querySelector('p.shrink-0') as HTMLElement;
    const detailLine = firstItem.querySelector(':scope > p.truncate') as HTMLElement;
    const paragraphs = Array.from(firstItem.querySelectorAll('p')) as HTMLElement[];

    expect(topLine.classList.contains('gap-4')).toBe(true);
    expect(topLine.textContent?.toUpperCase()).toContain('VENCIDO HÁ 3 DIAS');
    expect(value.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 3.200,00');
    expect(value.classList.contains('shrink-0')).toBe(true);
    expect(detailLine.textContent).toContain('Boleto fornecedor AgroSul · Insumos');
    expect(detailLine.classList.contains('truncate')).toBe(true);
    expect(paragraphs.some((paragraph) => paragraph.textContent?.trim() === 'Insumos')).toBe(false);
  });

  it('should render singular and plural overdue days', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).toContain('vencido há 3 dias');
    expect(text).toContain('vencido há 1 dia');
  });

  it('should render due today and next seven days summaries when count is greater than zero', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).toContain('Contas vencendo hoje');
    expect(text).toContain('1 conta a pagar no valor total de R$ 1.850,00');
    expect(text).toContain('Próximos 7 dias');
    expect(text).toContain('5 contas somando R$ 7.400,00');
  });

  it('should render alerts in priority order and use vertical layout', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const text = textContent(fixture);
    const todayIndex = text.indexOf('Contas vencendo hoje');
    const nextSevenDaysIndex = text.indexOf('Próximos 7 dias');
    const overdueIndex = text.indexOf('Contas atrasadas');
    const firstOverdueBillIndex = text.indexOf('Boleto fornecedor AgroSul');
    const alertList = fixture.nativeElement.querySelector(
      '[aria-label="Lista de alertas financeiros"]',
    ) as HTMLElement;

    expect(todayIndex).toBeGreaterThan(-1);
    expect(nextSevenDaysIndex).toBeGreaterThan(todayIndex);
    expect(overdueIndex).toBeGreaterThan(nextSevenDaysIndex);
    expect(firstOverdueBillIndex).toBeGreaterThan(overdueIndex);
    expect(alertList.classList.contains('space-y-4')).toBe(true);
    expect(alertList.className).not.toContain('grid');
    expect(alertList.className).not.toContain('grid-cols');
  });

  it('should omit due summaries when count is zero', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', {
      ...alerts,
      dueToday: { count: 0, totalAmount: 0 },
      dueNext7Days: { count: 0, totalAmount: 0 },
    });
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).not.toContain('Contas vencendo hoje');
    expect(text).not.toContain('Próximos 7 dias');
  });

  it('should render empty state when there are no alerts', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', {
      farmId: 1,
      overdueBills: [],
      dueToday: { count: 0, totalAmount: 0 },
      dueNext7Days: { count: 0, totalAmount: 0 },
    });
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).toContain('Nenhum alerta importante no momento');
    expect(text).toContain('Sua fazenda não possui contas atrasadas nem vencimentos próximos.');
  });

  it('should render error state', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('error', 'Não foi possível carregar os alertas financeiros.');
    fixture.detectChanges();

    const text = textContent(fixture);

    expect(text).toContain('Erro ao carregar alertas');
    expect(text).toContain('Não foi possível carregar os alertas financeiros.');
  });

  it('should render loading skeletons', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Carregando alertas financeiros"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('gd-skeleton')).toHaveLength(9);
  });

  it('should render overdue section without an outer danger card', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#overdue-alerts-title') as HTMLElement;
    const section = title.closest('section') as HTMLElement;

    expect(title.textContent).toContain('Contas atrasadas');
    expect(section.classList.contains('w-full')).toBe(true);
    expect(section.classList.contains('border-danger/25')).toBe(false);
    expect(section.classList.contains('bg-danger/5')).toBe(false);
    expect(section.classList.contains('p-4')).toBe(false);
    expect(section.classList.contains('rounded-xl')).toBe(false);
  });

  it('should keep overdue scroll on the item list and style each overdue item as a danger card', () => {
    const fixture = TestBed.createComponent(ImportantAlerts);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('ul[aria-label="Contas atrasadas"]') as HTMLElement;
    const items = Array.from(list.querySelectorAll('li')) as HTMLElement[];

    expect(list.classList.contains('max-h-[360px]')).toBe(true);
    expect(list.classList.contains('overflow-y-auto')).toBe(true);
    expect(list.classList.contains('pr-1')).toBe(true);

    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.classList.contains('rounded-xl')).toBe(true);
      expect(item.classList.contains('border-danger/25')).toBe(true);
      expect(item.classList.contains('bg-danger/5')).toBe(true);
      expect(item.classList.contains('p-4')).toBe(true);
    }
  });
});
