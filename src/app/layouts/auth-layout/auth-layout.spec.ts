import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  it('should render the auth shell and router outlet', async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthLayout);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('router-outlet')).toBeTruthy();
  });
});
