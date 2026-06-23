import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { Farm } from '../../core/models/farm.models';
import { AuthUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { MobileHeader } from './mobile-header';

@Component({
  template: '',
})
class LoginStub {}

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

const farms: Farm[] = [
  {
    id: 1,
    name: 'Fazenda Boa Safra',
    document: null,
    city: 'Ribeirão Preto',
    state: 'SP',
    totalArea: 120,
    productionType: 'AGRICULTURE',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sítio Santa Clara',
    document: null,
    city: null,
    state: 'MG',
    totalArea: null,
    productionType: 'MIXED',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('MobileHeader', () => {
  let fixture: ComponentFixture<MobileHeader>;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    authService = {
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [MobileHeader],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'dashboard', component: DashboardStub },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    toastStore.clear();
    selectedFarmStore.setFarms(farms);
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);

    fixture = TestBed.createComponent(MobileHeader);
    fixture.detectChanges();
  });

  afterEach(() => {
    selectedFarmStore.clear();
    toastStore.clear();
  });

  it('should render selected farm in the header', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Fazenda Boa Safra');
    expect(text).toContain('Ribeirão Preto/SP');
  });

  it('should render menu button and open drawer', () => {
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

  it('should render authenticated user name, email and initials in the drawer', () => {
    openDrawer();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('MS');
  });

  it('should render selected farm in the drawer and allow changing it', () => {
    openDrawer();

    const select = fixture.nativeElement.querySelector('#mobile-farm-select') as HTMLSelectElement;

    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(selectedFarmStore.selectedFarmId()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Sítio Santa Clara');
    expect(fixture.nativeElement.textContent).toContain('MG');
  });

  it('should render empty farm state', () => {
    selectedFarmStore.setFarms([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma fazenda disponível');
  });

  it('should close drawer when a navigation link is clicked', () => {
    openDrawer();

    const dashboardLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Dashboard'));

    dashboardLink?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should logout, close drawer, clear session and farm context, navigate to login and show success toast', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.title).toBe('Sessão encerrada.');
  });

  it('should close drawer and clear local session and farm context when logout fails', () => {
    authService.logout.mockReturnValueOnce(throwError(() => new Error('logout failed')));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    openDrawer();

    clickLogout();
    fixture.detectChanges();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.type).toBe('info');
    expect(toastStore.toasts()[0]?.title).toBe('Sessão local encerrada.');
  });

  function openDrawer(): void {
    const menuButton = fixture.nativeElement.querySelector(
      'button[aria-label="Abrir menu de navegação"]',
    ) as HTMLButtonElement;

    menuButton.click();
    fixture.detectChanges();
  }

  function clickLogout(): void {
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();
  }
});
