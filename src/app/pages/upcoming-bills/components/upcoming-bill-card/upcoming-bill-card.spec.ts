import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpcomingBill } from '../../../../core/models/financial.models';

import { UpcomingBillCard } from './upcoming-bill-card';

const bill: UpcomingBill = {
  id: 1,
  description: 'Compra de sementes',
  amount: 2500,
  status: 'PENDING',
  dueDate: '2026-06-30',
  farmId: 1,
  categoryId: 1,
  categoryName: 'Insumos',
  paymentMethod: 'PIX',
};

describe('UpcomingBillCard', () => {
  let fixture: ComponentFixture<UpcomingBillCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingBillCard],
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingBillCard);
    fixture.componentRef.setInput('bill', bill);
    fixture.componentRef.setInput('dueText', 'Vence em 4 dias');
    fixture.componentRef.setInput('dueVariant', 'warning');
    fixture.detectChanges();
  });

  it('should render bill details and due highlight', () => {
    expect(fixture.nativeElement.textContent).toContain('Compra de sementes');
    expect(fixture.nativeElement.textContent).toContain('Insumos');
    expect(fixture.nativeElement.textContent).toContain('R$');
    expect(fixture.nativeElement.textContent).toContain('Pendente');
    expect(fixture.nativeElement.textContent).toContain('Vence em 4 dias');
    expect(fixture.nativeElement.textContent).toContain('Pix');
  });

  it('should emit action events', () => {
    const paidSpy = vi.fn();
    const cancelSpy = vi.fn();
    fixture.componentInstance.markAsPaidRequested.subscribe(paidSpy);
    fixture.componentInstance.cancelRequested.subscribe(cancelSpy);
    fixture.componentRef.setInput('canMarkAsPaid', true);
    fixture.componentRef.setInput('canCancel', true);
    fixture.detectChanges();

    clickButton('Marcar como paga');
    clickButton('Cancelar');

    expect(paidSpy).toHaveBeenCalledWith(bill);
    expect(cancelSpy).toHaveBeenCalledWith(bill);
  });

  function clickButton(label: string): void {
    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (item) => (item as HTMLButtonElement).textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
    button?.click();
    fixture.detectChanges();
  }
});
