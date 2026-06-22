import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { DesktopSidebar } from './desktop-sidebar';

describe('DesktopSidebar', () => {
  it('should render the main navigation links', async () => {
    await TestBed.configureTestingModule({
      imports: [DesktopSidebar],
      providers: [provideGestaoDiretaIcons(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DesktopSidebar);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dashboard');
    expect(text).toContain('Fazendas');
    expect(text).toContain('Usuários');
    expect(text).toContain('Movimentações');
    expect(text).toContain('Contas a vencer');
    expect(text).toContain('Perfil');
  });
});
