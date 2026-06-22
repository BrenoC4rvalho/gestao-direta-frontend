import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { AuthUser } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';

import { LoginPage } from './login-page';

@Component({
  template: '',
})
class DashboardStub {}

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let authService: { login: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      login: vi.fn().mockReturnValue(of({ user })),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: 'dashboard', component: DashboardStub }]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  it('should render email and password fields', () => {
    const text = fixture.nativeElement.textContent as string;
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const email = inputs[0];
    const password = inputs[1];

    expect(text).toContain('Entrar no Gestão Direta');
    expect(email.type).toBe('email');
    expect(password.type).toBe('password');
  });

  it('should validate required fields', () => {
    const form = (fixture.componentInstance as unknown as { form: { invalid: boolean } }).form;
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;

    submit.click();
    fixture.detectChanges();

    expect(form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe seu e-mail.');
    expect(fixture.nativeElement.textContent).toContain('Informe sua senha.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should call AuthService.login when valid', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          email: { setValue(value: string): void };
          password: { setValue(value: string): void };
        };
      };
    };

    component.form.controls.email.setValue('maria@example.com');
    component.form.controls.password.setValue('secret');
    fixture.detectChanges();

    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'maria@example.com',
      password: 'secret',
    });
  });
});
