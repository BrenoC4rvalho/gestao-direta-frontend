import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../../core/constants/lucide-icons';

import { UserForm } from './user-form';

describe('UserForm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();
  });

  it('should render all fields', () => {
    const fixture = createForm();

    expect(getInput(fixture.nativeElement, 0).id).toBe('user-name');
    expect(getInput(fixture.nativeElement, 1).id).toBe('user-email');
    expect(getInput(fixture.nativeElement, 2).id).toBe('user-password');
    expect(getInput(fixture.nativeElement, 3).id).toBe('user-document');
    expect(fixture.nativeElement.querySelector('gd-select select')?.id).toBe('user-type');
  });

  it('should mark required fields when submitting an empty form', () => {
    const fixture = createForm();

    submit(fixture.nativeElement);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Informe o nome do usuário.');
    expect(text).toContain('Informe o e-mail.');
    expect(text).toContain('Informe a senha.');
    expect(text).toContain('Selecione o tipo de usuário.');
  });

  it('should validate email and minimum password length', () => {
    const fixture = createForm();

    setInput(fixture.nativeElement, 0, 'Maria Silva');
    setInput(fixture.nativeElement, 1, 'email-invalido');
    setInput(fixture.nativeElement, 2, '1234567');
    setSelect(fixture.nativeElement, 'USER');
    submit(fixture.nativeElement);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Informe um e-mail válido.');
    expect(text).toContain('A senha deve ter pelo menos 8 caracteres.');
  });

  it('should normalize and emit a valid payload', () => {
    const fixture = createForm();
    const submitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));

    setInput(fixture.nativeElement, 0, ' Maria Silva ');
    setInput(fixture.nativeElement, 1, ' MARIA@EXAMPLE.COM ');
    setInput(fixture.nativeElement, 2, ' password123 ');
    setInput(fixture.nativeElement, 3, ' 123.456.789-00 ');
    setSelect(fixture.nativeElement, 'USER');
    submit(fixture.nativeElement);

    expect(submitted).toEqual([
      {
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'password123',
        document: '123.456.789-00',
        userType: 'USER',
      },
    ]);
  });

  it('should emit null for an empty document', () => {
    const fixture = createForm();
    const submitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));

    setInput(fixture.nativeElement, 0, 'Maria Silva');
    setInput(fixture.nativeElement, 1, 'maria@example.com');
    setInput(fixture.nativeElement, 2, 'password123');
    setSelect(fixture.nativeElement, 'ADMIN');
    submit(fixture.nativeElement);

    expect(submitted).toEqual([
      {
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'password123',
        document: null,
        userType: 'ADMIN',
      },
    ]);
  });


  it('should limit type options with allowedUserTypes', () => {
    const fixture = TestBed.createComponent(UserForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('allowedUserTypes', ['USER']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('gd-select select')).toBeNull();
  });

  it('should not emit ADMIN when only USER is allowed', () => {
    const fixture = TestBed.createComponent(UserForm);
    const submitted: unknown[] = [];
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('allowedUserTypes', ['USER']);
    fixture.componentInstance.submitted.subscribe((payload) => submitted.push(payload));
    fixture.detectChanges();

    setInput(fixture.nativeElement, 0, 'Maria Silva');
    setInput(fixture.nativeElement, 1, 'maria@example.com');
    setInput(fixture.nativeElement, 2, 'password123');
    submit(fixture.nativeElement);

    expect(submitted).toEqual([
      {
        name: 'Maria Silva',
        email: 'maria@example.com',
        password: 'password123',
        document: null,
        userType: 'USER',
      },
    ]);
  });

  it('should reset and emit cancellation', () => {
    const fixture = createForm();
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    setInput(fixture.nativeElement, 0, 'Maria Silva');

    findButton(fixture.nativeElement, 'Cancelar')?.click();
    fixture.detectChanges();

    expect(cancelled).toHaveBeenCalledOnce();
    expect(getInput(fixture.nativeElement, 0).value).toBe('');
  });

  it('should disable actions while submitting', () => {
    const fixture = TestBed.createComponent(UserForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Cancelar')?.disabled).toBe(true);
    expect(findButton(fixture.nativeElement, 'Salvar')?.disabled).toBe(true);
  });

  it('should clear only the password after an error', () => {
    const fixture = createForm();
    setInput(fixture.nativeElement, 0, 'Maria Silva');
    setInput(fixture.nativeElement, 2, 'password123');

    fixture.componentInstance.clearPassword();
    fixture.detectChanges();

    expect(getInput(fixture.nativeElement, 0).value).toBe('Maria Silva');
    expect(getInput(fixture.nativeElement, 2).value).toBe('');
  });
});

function createForm() {
  const fixture = TestBed.createComponent(UserForm);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return fixture;
}

function getInput(root: HTMLElement, index: number): HTMLInputElement {
  return root.querySelectorAll<HTMLInputElement>('gd-input input')[index];
}

function setInput(root: HTMLElement, index: number, value: string): void {
  const input = getInput(root, index);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(root: HTMLElement, value: string): void {
  const select = root.querySelector('gd-select select') as HTMLSelectElement;
  const option = Array.from(select.options).find((item) => item.textContent?.trim() === (value === 'ADMIN' ? 'Administrador' : 'Usuário'));

  if (!option) {
    throw new Error(`Option not found: ${value}`);
  }

  select.value = option.value;
  select.dispatchEvent(new Event('change'));
}

function submit(root: HTMLElement): void {
  (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  );
}
