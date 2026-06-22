import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { UiTestPage } from './ui-test-page';

describe('UiTestPage', () => {
  it('should render the visual test examples', async () => {
    await TestBed.configureTestingModule({
      imports: [UiTestPage],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const fixture = TestBed.createComponent(UiTestPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UI Test — Gestão Direta');
    expect(text).toContain('Buttons');
    expect(text).toContain('Badges');
    expect(text).toContain('Forms');
    expect(text).toContain('Este campo é obrigatório.');
    expect(text).toContain('Skeletons');
    expect(text).toContain('Nenhum registro encontrado');
    expect(text).toContain('Não foi possível carregar os dados');
  });
});
