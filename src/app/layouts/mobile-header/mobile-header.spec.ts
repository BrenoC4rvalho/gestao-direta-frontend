import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { MobileHeader } from './mobile-header';

describe('MobileHeader', () => {
  it('should render menu button and open drawer', async () => {
    await TestBed.configureTestingModule({
      imports: [MobileHeader],
      providers: [provideGestaoDiretaIcons(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(MobileHeader);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu de navegação"]',
    ) as HTMLButtonElement;

    expect(menuButton).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    menuButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Menu');
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
