import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { SummaryCard } from './summary-card';

const description = 'Resultado financeiro já realizado: entradas pagas menos saídas pagas.';
const detail = 'Considera apenas movimentações pagas.';

describe('SummaryCard', () => {
  async function createComponent(
    detailText: string | null = detail,
    metaText: string | null = null,
    density: 'default' | 'compact' = 'default',
  ) {
    await TestBed.configureTestingModule({
      imports: [SummaryCard],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(SummaryCard);
    fixture.componentRef.setInput('title', 'Saldo atual');
    fixture.componentRef.setInput('value', 'R$ 1.000,00');
    fixture.componentRef.setInput('description', description);
    fixture.componentRef.setInput('meta', metaText);
    fixture.componentRef.setInput('detail', detailText);
    fixture.componentRef.setInput('icon', 'wallet');
    fixture.componentRef.setInput('density', density);
    fixture.detectChanges();

    return fixture;
  }

  function visibleCardText(fixture: ComponentFixture<SummaryCard>): string {
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;
    const paragraphs = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).filter((paragraph) => !tooltip?.contains(paragraph));

    return paragraphs.map((paragraph) => paragraph.textContent ?? '').join(' ');
  }

  it('should render title, value and accessible tooltip explanation', async () => {
    const fixture = await createComponent();

    expect(visibleCardText(fixture)).toContain('Saldo atual');
    expect(visibleCardText(fixture)).toContain('R$ 1.000,00');
    expect(visibleCardText(fixture)).not.toContain(description);
    expect(visibleCardText(fixture)).not.toContain(detail);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('Explicação sobre Saldo atual');
    expect(button?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    expect(tooltip?.textContent).toContain(description);
    expect(tooltip?.textContent).toContain(detail);
  });

  it('should render optional meta text outside the tooltip', async () => {
    const fixture = await createComponent(detail, '2 contas');

    expect(visibleCardText(fixture)).toContain('2 contas');
  });

  it('should scope tooltip hover and focus to the info button wrapper', async () => {
    const fixture = await createComponent();

    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;
    const tooltipWrapper = button.parentElement as HTMLElement;

    expect(article.classList.contains('group')).toBe(false);
    expect(article.className).toContain('sm:hover:border-primary/25');
    expect(article.className).toContain('sm:hover:shadow-md');
    expect(article.classList.contains('z-0')).toBe(true);
    expect(article.classList.contains('overflow-visible')).toBe(true);
    expect(article.classList.contains('focus-within:z-30')).toBe(true);
    expect(article.classList.contains('sm:hover:z-30')).toBe(true);
    expect(tooltipWrapper.classList.contains('group')).toBe(true);
    expect(tooltipWrapper.classList.contains('relative')).toBe(true);
    expect(tooltipWrapper.classList.contains('z-50')).toBe(true);
    expect(tooltipWrapper.contains(tooltip)).toBe(true);
    expect(tooltip.classList.contains('z-50')).toBe(true);
    expect(tooltip.className).toContain('group-hover:visible');
    expect(tooltip.className).toContain('group-focus-within:visible');
  });

  it('should toggle tooltip state by click', async () => {
    const fixture = await createComponent();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('should work without optional detail', async () => {
    const fixture = await createComponent(null);
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;

    expect(visibleCardText(fixture)).toContain('Saldo atual');
    expect(visibleCardText(fixture)).not.toContain(description);
    expect(tooltip?.textContent).toContain(description);
    expect(tooltip?.textContent).not.toContain(detail);
  });

  it('should keep long values readable and use full-height default layout', async () => {
    const fixture = await createComponent();

    const value = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).find((item) => item.textContent?.includes('R$ 1.000,00'));
    const article = fixture.nativeElement.querySelector('article') as HTMLElement | null;

    expect(value?.className).toContain('break-words');
    expect(value?.className).not.toContain('truncate');
    expect(article?.className).toContain('h-full');
    expect(article?.className).toContain('min-h-[144px]');
    expect(article?.className).toContain('p-6');
    expect(article?.className).toContain('gap-5');
  });

  it('should render compact density with reduced spacing and typography', async () => {
    const fixture = await createComponent(detail, '2 contas', 'compact');

    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    const icon = (article.querySelector('svg') as SVGElement).parentElement as HTMLElement;
    const title = Array.from(article.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>).find(
      (item) => item.textContent?.includes('Saldo atual'),
    );
    const value = Array.from(article.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>).find(
      (item) => item.textContent?.includes('R$ 1.000,00'),
    );
    const meta = Array.from(article.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>).find(
      (item) => item.textContent?.includes('2 contas'),
    );
    const header = article.firstElementChild as HTMLElement;
    const headerContent = header.firstElementChild as HTMLElement;
    const button = article.querySelector('button') as HTMLButtonElement;

    expect(article.className).toContain('min-h-[100px]');
    expect(article.className).toContain('p-4');
    expect(article.className).toContain('gap-4');
    expect(article.className).toContain('justify-start');
    expect(header.className).toContain('items-center');
    expect(headerContent.className).toContain('items-center');
    expect(icon.className).toContain('size-9');
    expect(title?.className).toContain('text-xs');
    expect(title?.className).not.toContain('pt-0.5');
    expect(value?.className).toContain('text-lg');
    expect(value?.className).toContain('whitespace-nowrap');
    expect(value?.className).toContain('truncate');
    expect(meta?.className).toContain('text-xs');
    expect(button.className).toContain('size-7');
    expect(visibleCardText(fixture)).not.toContain(description);
  });

  it('should preserve multi-line meta text in compact density', async () => {
    const fixture = await createComponent(null, 'Realizado: R$ 800,00\nProjetado: R$ 200,00', 'compact');
    const meta = Array.from(
      fixture.nativeElement.querySelectorAll('p') as NodeListOf<HTMLParagraphElement>,
    ).find((item) => item.textContent?.includes('Realizado: R$ 800,00'));

    expect(meta?.textContent).toContain('Realizado: R$ 800,00\nProjetado: R$ 200,00');
    expect(meta?.className).toContain('whitespace-pre-line');
    expect(meta?.className).toContain('text-xs');
  });
});
