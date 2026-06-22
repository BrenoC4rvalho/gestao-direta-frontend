import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { AppLayout } from './app-layout';

describe('AppLayout', () => {
  it('should render navigation layout and router outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [provideGestaoDiretaIcons(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('gd-desktop-sidebar')).toBeTruthy();
    expect(element.querySelector('gd-mobile-header')).toBeTruthy();
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });
});
