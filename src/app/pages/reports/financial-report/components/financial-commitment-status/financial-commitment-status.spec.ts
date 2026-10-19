import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialCommitmentStatusComponent } from './financial-commitment-status';

describe('FinancialCommitmentStatusComponent', () => {
  let fixture: ComponentFixture<FinancialCommitmentStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialCommitmentStatusComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialCommitmentStatusComponent);
    fixture.componentRef.setInput('status', {
      history: {
        expensesOnTime: 4,
        expensesLate: 1,
        incomesOnTime: 3,
        incomesLate: 2,
        expenseOnTimeRate: 57.14,
        incomeOnTimeRate: 50,
        unclassifiableExpenses: 0,
        unclassifiableIncomes: 1,
      },
      current: {
        referenceDate: '2026-10-18',
        overduePayables: { count: 2, amount: 1200 },
        overdueReceivables: { count: 1, amount: 800 },
      },
      upcoming: {
        days: 7,
        payables: { count: 3, amount: 900 },
        receivables: { count: 2, amount: 1400 },
      },
    });
    fixture.componentRef.setInput('historyStartDate', '2026-10-01');
    fixture.componentRef.setInput('historyEndDate', '2026-10-31');
    fixture.detectChanges();
  });

  it('renders history, current pending and upcoming indicators', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Pagas no prazo');
    expect(text).toContain('Recebidas com atraso');
    expect(text).toContain('Pendências atuais');
    expect(text).toContain('Próximos 7 dias');
    expect(text).toContain('Cumprimento dos pagamentos');
    expect(text).toContain('Cumprimento dos recebimentos');
    expect(text).toContain('liquidações no período selecionado');
    expect(text).toContain('57,14%');
    expect(text).toContain('R$');
    expect(text).toContain('01/10/2026');
    expect(text).toContain('31/10/2026');
    expect(text).toContain('Compromissos em aberto a partir da data de referência');
  });

  it('uses a flat layout with section dividers instead of nested metric cards', () => {
    const metrics = fixture.nativeElement.querySelectorAll('.commitment-metric');

    expect(metrics.length).toBe(8);
    expect(fixture.nativeElement.querySelectorAll('.commitment-section-divider').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.commitment-grid--history').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.commitment-grid--two').length).toBe(2);

    for (const metric of Array.from(metrics) as HTMLElement[]) {
      expect(metric.classList.contains('rounded-app')).toBe(false);
      expect(metric.classList.contains('border')).toBe(false);
      expect(metric.classList.contains('bg-background')).toBe(false);
    }
  });

  it('emits the selected commitment segment', () => {
    const selected: string[] = [];
    fixture.componentInstance.segmentSelected.subscribe((segment) => selected.push(segment));

    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(
      (item) => item.textContent?.includes('Pagas com atraso'),
    ) as HTMLButtonElement;
    button.click();

    expect(selected).toEqual(['PAID_LATE']);
  });

  it('offers a separate query for unclassifiable receipts', () => {
    const selected: string[] = [];
    fixture.componentInstance.segmentSelected.subscribe((segment) => selected.push(segment));

    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes('Ver movimentações')) as HTMLButtonElement;
    button.click();

    expect(selected).toEqual(['UNCLASSIFIABLE_RECEIVABLE']);
    expect(fixture.nativeElement.textContent).toContain(
      'recebimentos não puderam ser avaliados por falta de informações de prazo',
    );
  });
});
