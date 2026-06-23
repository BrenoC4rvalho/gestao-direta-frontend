import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';

import { SummaryCard } from './summary-card';

describe('SummaryCard', () => {
  it('should render input data', async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(SummaryCard);
    fixture.componentRef.setInput('title', 'Entradas');
    fixture.componentRef.setInput('value', 'R$ 1.000,00');
    fixture.componentRef.setInput('helper', 'Receitas confirmadas');
    fixture.componentRef.setInput('icon', 'wallet');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Entradas');
    expect(text).toContain('R$ 1.000,00');
    expect(text).toContain('Receitas confirmadas');

    const value = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).find((item) => item.textContent?.includes('R$ 1.000,00'));

    expect(value?.className).toContain('break-words');
    expect(value?.className).not.toContain('truncate');
  });
});
