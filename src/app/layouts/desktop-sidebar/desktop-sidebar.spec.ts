import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { FarmAccessStore } from '../../core/stores/farm-access.store';
import { SelectedFarmStore } from '../../core/stores/selected-farm.store';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { DesktopSidebar } from './desktop-sidebar';

@Component({
  template: '',
})
class LoginStub {}

@Component({
  template: '',
})
class ProfileStub {}

const user: AuthUser = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};


const producerUser: AuthUser = {
  ...user,
  userType: 'USER',
};

const producerAccess = {
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 1,
  userType: 'USER',
  role: 'PRODUCER',
  permissions: {
    canViewFarm: true,
    canEditFarm: true,
    canChangeFarmStatus: false,
    canManageFarmUsers: true,
    canViewFinancial: true,
    canManageTransactions: true,
    canManageCategories: true,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

describe('DesktopSidebar', () => {
  let fixture: ComponentFixture<DesktopSidebar>;
  let authService: { logout: ReturnType<typeof vi.fn> };
  let router: Router;
  let farmAccessStore: FarmAccessStore;
  let selectedFarmStore: SelectedFarmStore;
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    authService = {
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [DesktopSidebar],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([
          { path: 'login', component: LoginStub },
          { path: 'profile', component: ProfileStub },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    farmAccessStore = TestBed.inject(FarmAccessStore);
    selectedFarmStore = TestBed.inject(SelectedFarmStore);
    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    selectedFarmStore.clear();
    toastStore.clear();
    sessionStore.setUser(user);
    sessionStore.setInitialized(true);

    fixture = TestBed.createComponent(DesktopSidebar);
    fixture.detectChanges();
  });

  afterEach(() => {
    farmAccessStore.clear();
    selectedFarmStore.clear();
    toastStore.clear();
  });

  it('should render the brand logo', () => {
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(image).toBeTruthy();
    expect(image.getAttribute('src')).toContain('/assets/brand/logo_horizontal.svg');
    expect(image.getAttribute('alt')).toBe('Gestão Direta');
  });

  it('should render the main navigation links without farm selector', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Dashboard');
    expect(text).toContain('Fazendas');
    expect(text).toContain('Usuários');
    expect(text).toContain('Movimentações');
    expect(text).toContain('Contas a vencer');
    expect(fixture.nativeElement.querySelector('nav')?.textContent).not.toContain('Perfil');
    expect(fixture.nativeElement.querySelector('#global-farm-select')).toBeNull();
  });


  it('should render Users for a producer with farm user management permission', () => {
    sessionStore.setUser(producerUser);
    farmAccessStore.setAccess(producerAccess);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Usuários');
  });

  it('should hide Users for a non-admin user without farm user management permission', () => {
    sessionStore.setUser(producerUser);
    farmAccessStore.setAccess({
      ...producerAccess,
      permissions: { ...producerAccess.permissions, canManageFarmUsers: false },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Usuários');
  });

  it('should render authenticated user as a profile link', () => {
    const text = fixture.nativeElement.textContent as string;
    const profileLink = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Maria Silva'));

    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('MS');
    expect(profileLink?.getAttribute('href')).toBe('/profile');
  });

  it('should logout, clear session and farm context, navigate to login and show success toast', () => {
    const clearAccess = vi.spyOn(farmAccessStore, 'clear');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(clearAccess).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.title).toBe('Sessão encerrada.');
  });

  it('should clear local session and farm context when logout fails', () => {
    authService.logout.mockReturnValueOnce(throwError(() => new Error('logout failed')));
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const logoutButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Sair'));

    logoutButton?.click();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(sessionStore.user()).toBeNull();
    expect(selectedFarmStore.selectedFarm()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(toastStore.toasts()[0]?.type).toBe('info');
    expect(toastStore.toasts()[0]?.title).toBe('Sessão local encerrada.');
  });
});
