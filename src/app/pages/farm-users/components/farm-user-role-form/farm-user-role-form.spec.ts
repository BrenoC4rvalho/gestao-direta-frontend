import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmUser } from '../../../../core/models/farm-user.models';

import { FarmUserRoleForm } from './farm-user-role-form';

const farmUser: FarmUser = {
  id: 1,
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 2,
  userName: 'Maria Silva',
  userEmail: 'maria@example.com',
  role: 'EMPLOYEE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('FarmUserRoleForm', () => {
  let fixture: ComponentFixture<FarmUserRoleForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FarmUserRoleForm] }).compileComponents();
    fixture = TestBed.createComponent(FarmUserRoleForm);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('farmUser', farmUser);
    fixture.componentRef.setInput('roles', ['EMPLOYEE', 'ACCOUNTANT']);
    fixture.detectChanges();
  });

  it('should render edit copy', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Papel na fazenda');
    expect(text).toContain('Salvar alterações');
  });

  it('should omit the current role from options', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Funcionário');
    expect(text).toContain('Contador');
  });

  it('should emit the selected role', () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitted).toHaveBeenCalledWith({ role: 'ACCOUNTANT' });
  });
});
