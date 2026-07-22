import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { ToastStore } from '../../core/stores/toast.store';
import { ContactMessagingSection } from './contact-messaging-section';
import { UserContact } from './user-contact.models';

interface ContactMessagingHarness {
  contact: { (): UserContact; set(value: UserContact): void };
  drawerOpen: () => boolean;
  confirmChangeOpen: () => boolean;
  phoneForm: {
    controls: {
      phone: {
        setValue(value: string): void;
        value: string | null;
        hasError(error: string): boolean;
      };
    };
  };
  openPhoneDrawer(): void;
  submitPhone(): void;
  confirmPhoneChange(): void;
  cancelPhoneChange(): void;
}

describe('ContactMessagingSection', () => {
  let fixture: ComponentFixture<ContactMessagingSection>;
  let toastStore: ToastStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactMessagingSection],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    toastStore = TestBed.inject(ToastStore);
    toastStore.clear();
  });

  afterEach(() => toastStore.clear());

  function createComponent(): ContactMessagingHarness {
    fixture = TestBed.createComponent(ContactMessagingSection);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as ContactMessagingHarness;
  }

  function setExistingPhone(component: ContactMessagingHarness, phoneNumber = '+5524999999999'): void {
    component.contact.set({
      id: '1',
      phoneNumber,
      phoneVerificationStatus: 'PENDING',
      phoneVerifiedAt: null,
      preferredChannel: 'NONE',
      status: 'PENDING',
    });
  }

  it('renders the empty phone state and future message channels', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Nenhum telefone cadastrado');
    expect(fixture.nativeElement.textContent).toContain('Telegram');
    expect(fixture.nativeElement.textContent).toContain('WhatsApp');
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons).filter((button) => button.disabled)).toHaveLength(2);
  });

  it('opens the drawer from the add phone action', () => {
    const component = createComponent();

    findButton('Adicionar telefone')?.click();
    fixture.detectChanges();

    expect(component.drawerOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe o número com código do país e DDD.');
  });

  it('requires a phone number and rejects incomplete values', () => {
    const component = createComponent();
    component.openPhoneDrawer();
    component.submitPhone();
    fixture.detectChanges();

    expect(component.phoneForm.controls.phone.hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Informe seu telefone.');

    component.phoneForm.controls.phone.setValue('+55 (24) 999');
    component.submitPhone();
    fixture.detectChanges();

    expect(component.phoneForm.controls.phone.hasError('phoneLength')).toBe(true);
  });

  it('masks, normalizes and saves a valid phone as pending', () => {
    vi.useFakeTimers();
    const component = createComponent();
    component.openPhoneDrawer();
    component.phoneForm.controls.phone.setValue('+5524999999999');

    expect(component.phoneForm.controls.phone.value).toBe('+55 (24) 99999-9999');

    component.submitPhone();
    vi.advanceTimersByTime(600);
    fixture.detectChanges();

    expect(component.contact().phoneNumber).toBe('+5524999999999');
    expect(component.contact().phoneVerificationStatus).toBe('PENDING');
    expect(component.drawerOpen()).toBe(false);
    expect(toastStore.toasts()[0]?.title).toBe('Telefone atualizado com sucesso.');
    vi.useRealTimers();
  });

  it('prefills the current number and asks for confirmation before an edit', () => {
    const component = createComponent();
    setExistingPhone(component);
    fixture.detectChanges();
    component.openPhoneDrawer();

    expect(component.phoneForm.controls.phone.value).toBe('+55 (24) 99999-9999');

    component.phoneForm.controls.phone.setValue('+5524888888888');
    component.submitPhone();
    fixture.detectChanges();

    expect(component.confirmChangeOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ao alterar o telefone, a validação atual será reiniciada.');
  });

  it('keeps the existing data when the phone change is cancelled', () => {
    const component = createComponent();
    setExistingPhone(component);
    component.openPhoneDrawer();
    component.phoneForm.controls.phone.setValue('+5524888888888');
    component.submitPhone();
    component.cancelPhoneChange();

    expect(component.contact().phoneNumber).toBe('+5524999999999');
    expect(component.drawerOpen()).toBe(true);
    expect(component.confirmChangeOpen()).toBe(false);
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    return Array.from(buttons).find((button) => button.textContent?.trim() === label);
  }
});
