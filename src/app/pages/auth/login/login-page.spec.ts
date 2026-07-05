import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { AuthResponse, AuthUser } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { SystemStatusService } from '../../../core/services/system-status.service';
import { ToastStore } from '../../../core/stores/toast.store';

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
  let systemStatusService: {
    getStatus: ReturnType<typeof vi.fn>;
    isHealthy: ReturnType<typeof vi.fn>;
  };
  let toastStore: ToastStore;

  beforeEach(async () => {
    authService = {
      login: vi.fn().mockReturnValue(of({ user })),
    };
    systemStatusService = {
      getStatus: vi.fn().mockReturnValue(of({ status: 'UP', database: 'UP' })),
      isHealthy: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'dashboard', component: DashboardStub },
          { path: 'server-error', component: DashboardStub },
        ]),
        { provide: AuthService, useValue: authService },
        { provide: SystemStatusService, useValue: systemStatusService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    toastStore = TestBed.inject(ToastStore);
    toastStore.clear();
    fixture.detectChanges();
  });

  afterEach(() => {
    toastStore.clear();
  });

  function textContent(): string {
    return fixture.nativeElement.textContent as string;
  }

  function query<T extends Element>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  function fillValidForm(): void {
    query<HTMLInputElement>('[data-testid="login-email"]')!.value = 'maria@example.com';
    query<HTMLInputElement>('[data-testid="login-email"]')!.dispatchEvent(new Event('input'));
    query<HTMLInputElement>('[data-testid="login-password"]')!.value = 'secret';
    query<HTMLInputElement>('[data-testid="login-password"]')!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should render the brand logo', () => {
    const logo = query<HTMLImageElement>('[data-testid="login-logo"]');

    expect(logo).not.toBeNull();
    expect(logo?.alt).toBe('Gestão Direta');
    expect(logo?.getAttribute('ng-reflect-ng-src') ?? logo?.getAttribute('src')).toContain(
      '/assets/brand/logo_horizontal.svg',
    );
  });

  it('should render the rural illustration asset', () => {
    const illustration = query<HTMLImageElement>('[data-testid="login-illustration"]');

    expect(illustration).not.toBeNull();
    expect(illustration?.alt).toBe('Ilustração rural');
    expect(
      illustration?.getAttribute('ng-reflect-ng-src') ?? illustration?.getAttribute('src'),
    ).toContain('/assets/img/login-farm-mobile.png');
  });

  it('should render desktop and mobile titles and subtitles', () => {
    expect(textContent()).toContain('Bem-vindo ao');
    expect(textContent()).toContain('Gestão Direta');
    expect(textContent()).toContain('Controle financeiro simples e confiável para sua propriedade.');
    expect(textContent()).toContain('Entrar na sua conta');
    expect(textContent()).toContain('Acesse sua gestão financeira rural com segurança.');
    expect(textContent()).toContain('Acompanhe saldo, safras e movimentações em um só lugar.');
  });

  it('should render feature pills and support footer', () => {
    expect(textContent()).toContain('Fluxo de caixa');
    expect(textContent()).toContain('Safras e lotes');
    expect(textContent()).toContain('Contas a vencer');
    expect(textContent()).toContain('Precisa de ajuda?');
    expect(textContent()).toContain('Fale com o suporte');
  });

  it('should render email and password fields', () => {
    const email = query<HTMLInputElement>('[data-testid="login-email"]');
    const password = query<HTMLInputElement>('[data-testid="login-password"]');

    expect(textContent()).toContain('E-mail');
    expect(textContent()).toContain('Senha');
    expect(email?.type).toBe('email');
    expect(password?.type).toBe('password');
  });

  it('should toggle password visibility', () => {
    const password = query<HTMLInputElement>('[data-testid="login-password"]');
    const toggle = query<HTMLButtonElement>('[data-testid="password-toggle"]');

    expect(password?.type).toBe('password');

    toggle?.click();
    fixture.detectChanges();

    expect(password?.type).toBe('text');
    expect(toggle?.getAttribute('aria-label')).toBe('Ocultar senha');

    toggle?.click();
    fixture.detectChanges();

    expect(password?.type).toBe('password');
    expect(toggle?.getAttribute('aria-label')).toBe('Mostrar senha');
  });

  it('should render the submit button', () => {
    const submit = query<HTMLButtonElement>('button[type="submit"]');

    expect(submit).not.toBeNull();
    expect(submit?.textContent).toContain('Entrar');
  });

  it('should validate required fields and not call login', () => {
    const form = (fixture.componentInstance as unknown as { form: { invalid: boolean } }).form;
    const submit = query<HTMLButtonElement>('button[type="submit"]');

    submit?.click();
    fixture.detectChanges();

    expect(form.invalid).toBe(true);
    expect(textContent()).toContain('Informe seu e-mail.');
    expect(textContent()).toContain('Informe sua senha.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should validate email format and not call login', () => {
    query<HTMLInputElement>('[data-testid="login-email"]')!.value = 'invalid-email';
    query<HTMLInputElement>('[data-testid="login-email"]')!.dispatchEvent(new Event('input'));
    query<HTMLInputElement>('[data-testid="login-password"]')!.value = 'secret';
    query<HTMLInputElement>('[data-testid="login-password"]')!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(textContent()).toContain('Informe um e-mail válido.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should call AuthService.login when valid', () => {
    fillValidForm();

    query<HTMLButtonElement>('button[type="submit"]')?.click();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'maria@example.com',
      password: 'secret',
    });
  });

  it('should keep the submit button in loading state while login is pending', () => {
    const loginResponse$ = new Subject<AuthResponse>();
    authService.login.mockReturnValueOnce(loginResponse$);
    fillValidForm();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    const submit = query<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(true);
    expect(submit?.textContent).toContain('Entrar');

    loginResponse$.next({ user });
    loginResponse$.complete();
  });

  it('should redirect to server error and skip login when status is unhealthy', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'DEGRADED', database: 'UP' }));
    systemStatusService.isHealthy.mockReturnValueOnce(false);
    fillValidForm();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(authService.login).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/server-error']);
  });

  it('should redirect to server error and skip login when status request fails', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    systemStatusService.getStatus.mockReturnValueOnce(throwError(() => new Error('network')));
    fillValidForm();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(authService.login).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/server-error']);
  });

  it('should show invalid credentials toast and clear password on 401 error', () => {
    authService.login.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })));
    fillValidForm();

    query<HTMLInputElement>('[data-testid="login-password"]')!.value = 'wrong-secret';
    query<HTMLInputElement>('[data-testid="login-password"]')!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(query<HTMLInputElement>('[data-testid="login-email"]')?.value).toBe('maria@example.com');
    expect(query<HTMLInputElement>('[data-testid="login-password"]')?.value).toBe('');
    expect(toastStore.toasts()[0]?.title).toBe('E-mail ou senha inválidos.');
  });

  it('should show invalid credentials toast on 403 error', () => {
    authService.login.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })));
    fillValidForm();

    query<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();

    expect(toastStore.toasts()[0]?.title).toBe('E-mail ou senha inválidos.');
  });
});
