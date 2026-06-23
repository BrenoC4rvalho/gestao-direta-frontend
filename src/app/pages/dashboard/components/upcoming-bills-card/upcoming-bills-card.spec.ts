import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { UpcomingBill } from '../../../../core/models/financial.models';

import { UpcomingBillsCard } from './upcoming-bills-card';

const bill: UpcomingBill = {
  id: 1,
  description: 'Conta de energia',
  amount: 320,
  status: 'PENDING',
  dueDate: '2026-01-20',
  farmId: 1,
  categoryId: 2,
  categoryName: 'Energia',
};

describe('UpcomingBillsCard', () => {
  it('should render bills received by input', async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingBillsCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpcomingBillsCard);
    fixture.componentRef.setInput('bills', [bill]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Conta de energia');
    expect(text).toContain('Energia');
    expect(text).toContain('Pendente');
  });

  it('should render empty state for empty lists', async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingBillsCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpcomingBillsCard);
    fixture.componentRef.setInput('bills', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma conta a vencer');
  });
});
