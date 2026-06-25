import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { AuthUser } from '../../core/models/auth.models';
import { PageResponse } from '../../core/models/page-response.model';
import { User } from '../../core/models/user.models';
import { UserService } from '../../core/services/user.service';
import { SessionStore } from '../../core/stores/session.store';
import { ToastStore } from '../../core/stores/toast.store';

import { UsersPage } from './users-page';

const admin: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
};

const users: User[] = [
  {
    id: 1,
    name: 'Maria Silva',
    email: 'maria@example.com',
    document: '123.456.789-00',
    userType: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'João Souza',
    email: 'joao@example.com',
    document: null,
    userType: 'USER',
    status: 'BLOCKED',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-11T00:00:00Z',
  },
];

function pageResponse(
  content: User[],
  page = 0,
  totalPages = content.length > 0 ? 1 : 0,
): PageResponse<User> {
  return {
    content,
    page,
    size: 10,
    totalElements: content.length,
    totalPages,
    first: page === 0,
    last: page === totalPages - 1,
  };
}

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let userService: { list: ReturnType<typeof vi.fn> };
  let sessionStore: SessionStore;
  let toastStore: ToastStore;

  beforeEach(async () => {
    userService = {
      list: vi.fn().mockReturnValue(of(pageResponse(users))),
    };

    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        provideGestaoDiretaIcons(),
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    sessionStore = TestBed.inject(SessionStore);
    toastStore = TestBed.inject(ToastStore);
    sessionStore.clear();
    toastStore.clear();
  });

  afterEach(() => {
    sessionStore.clear();
    toastStore.clear();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
  }

  it('should deny access without calling the API for a non-admin user', () => {
    sessionStore.setUser({ ...admin, userType: 'USER' });

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Usuários');
    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar usuários.',
    );
    expect(userService.list).not.toHaveBeenCalled();
    expect(findButton(fixture.nativeElement, 'Novo usuário')).toBeUndefined();
  });

  it('should load and render users for an admin', () => {
    sessionStore.setUser(admin);

    createPage();

    expect(userService.list).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Gerencie os usuários cadastrados no sistema.');
    expect(text).toContain('Maria Silva');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('Administrador');
    expect(text).toContain('Ativo');
    expect(text).toContain('João Souza');
    expect(text).toContain('Usuário');
    expect(text).toContain('Bloqueado');
  });

  it('should show skeletons while loading', () => {
    userService.list.mockReturnValueOnce(new Subject<PageResponse<User>>());
    sessionStore.setUser(admin);

    createPage();

    expect(
      fixture.nativeElement.querySelector('[aria-label="Carregando usuários"]'),
    ).toBeTruthy();
  });

  it('should show the empty state', () => {
    userService.list.mockReturnValueOnce(of(pageResponse([])));
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Nenhum usuário encontrado');
    expect(fixture.nativeElement.textContent).toContain(
      'Quando houver usuários cadastrados, eles aparecerão aqui.',
    );
  });

  it('should show an error state and retry loading', () => {
    userService.list.mockReturnValueOnce(throwError(() => new Error('Falha')));
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain(
      'Não foi possível carregar os usuários',
    );

    userService.list.mockReturnValueOnce(of(pageResponse(users)));
    findButton(fixture.nativeElement, 'Tentar novamente')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Maria Silva');
  });

  it('should handle a forbidden API response as restricted access', () => {
    userService.list.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    sessionStore.setUser(admin);

    createPage();

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.textContent).toContain(
      'Você não tem permissão para visualizar usuários.',
    );
    expect(toastStore.toasts()[0]?.title).toBe(
      'Você não tem permissão para visualizar usuários.',
    );
  });

  it('should load the next page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 0, 2)));
    sessionStore.setUser(admin);

    createPage();
    findButton(fixture.nativeElement, 'Próxima')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenLastCalledWith({
      page: 1,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should load the previous page', () => {
    userService.list.mockReturnValueOnce(of(pageResponse(users, 1, 2)));
    sessionStore.setUser(admin);

    createPage();
    findButton(fixture.nativeElement, 'Anterior')?.click();
    fixture.detectChanges();

    expect(userService.list).toHaveBeenLastCalledWith({
      page: 0,
      size: 10,
      sort: 'name',
      direction: 'ASC',
    });
  });

  it('should show future implementation feedback from the create button', () => {
    sessionStore.setUser(admin);

    createPage();
    findButton(fixture.nativeElement, 'Novo usuário')?.click();

    expect(toastStore.toasts()[0]?.title).toBe(
      'Cadastro de usuário será implementado em uma próxima etapa.',
    );
  });
});

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
