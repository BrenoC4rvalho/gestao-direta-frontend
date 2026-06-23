import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';
import { UpcomingBill } from '../../../../core/models/financial.models';

import { UpcomingBillsCard } from './upcoming-bills-card';

@Component({
  template: '',
})
class RouteStub {}

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
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: '**', component: RouteStub }]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpcomingBillsCard);
    fixture.componentRef.setInput('bills', [bill]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Conta de energia');
    expect(text).toContain('Energia');
    expect(text).toContain('Pendente');
    expect(text).toContain('Ver todas');
  });

  it('should render empty state for empty lists', async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingBillsCard],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: '**', component: RouteStub }]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpcomingBillsCard);
    fixture.componentRef.setInput('bills', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma conta a vencer');
  });
});
