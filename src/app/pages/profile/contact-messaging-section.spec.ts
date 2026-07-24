import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { UserContact } from '../../core/models/user-contact.models';
import { UserContactService } from '../../core/services/user-contact.service';
import { ToastStore } from '../../core/stores/toast.store';
import { ContactMessagingSection } from './contact-messaging-section';

const emptyContact: UserContact = { id: 1, phoneNumber: null, phoneVerificationStatus: 'NOT_INFORMED', phoneVerifiedAt: null, preferredChannel: 'NONE', status: 'PENDING', messagingAccounts: [] };

describe('ContactMessagingSection', () => {
  let fixture: ComponentFixture<ContactMessagingSection>;
  let service: { getMyContact: ReturnType<typeof vi.fn>; updateMyPhone: ReturnType<typeof vi.fn>; generateMessagingLinkCode: ReturnType<typeof vi.fn>; unlinkMessagingAccount: ReturnType<typeof vi.fn> };
  let toastStore: ToastStore;

  beforeEach(async () => {
    service = { getMyContact: vi.fn().mockReturnValue(of(emptyContact)), updateMyPhone: vi.fn().mockReturnValue(of(emptyContact)), generateMessagingLinkCode: vi.fn().mockReturnValue(of({ code: '482913', channel: 'TELEGRAM', expiresAt: '2099-07-23T23:30:00Z' })), unlinkMessagingAccount: vi.fn().mockReturnValue(of(undefined)) };
    await TestBed.configureTestingModule({ imports: [ContactMessagingSection], providers: [provideGestaoDiretaIcons(), { provide: UserContactService, useValue: service }] }).compileComponents();
    toastStore = TestBed.inject(ToastStore);
    toastStore.clear();
  });

  afterEach(() => toastStore.clear());

  function create(): ContactMessagingSection {
    fixture = TestBed.createComponent(ContactMessagingSection);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads the contact and renders empty phone and future WhatsApp', () => {
    create();
    expect(service.getMyContact).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Nenhum telefone cadastrado');
    expect(fixture.nativeElement.textContent).toContain('Em breve');
  });

  it('renders a phone returned by the API and normalizes it before PUT', () => {
    const component = create();
    component['openPhoneDrawer']();
    component['phoneForm'].controls.phone.setValue('+55 (24) 99999-9999');
    component['submitPhone']();
    expect(service.updateMyPhone).toHaveBeenCalledWith('+5524999999999');
    expect(toastStore.toasts()[0]?.title).toBe('Telefone atualizado com sucesso.');
  });

  it('asks confirmation before changing an existing phone', () => {
    service.getMyContact.mockReturnValueOnce(of({ ...emptyContact, phoneNumber: '+5524999999999', phoneVerificationStatus: 'PENDING' }));
    const component = create();
    component['openPhoneDrawer']();
    component['phoneForm'].controls.phone.setValue('+5524888888888');
    component['submitPhone']();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ao alterar o telefone');
  });

  it('shows a validation error and PUT failure toast', () => {
    const component = create();
    component['openPhoneDrawer']();
    component['submitPhone']();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Informe seu telefone.');
    service.updateMyPhone.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
    component['phoneForm'].controls.phone.setValue('+5524999999999');
    component['submitPhone']();
    expect(toastStore.toasts()[0]?.title).toBe('Não foi possível atualizar o telefone.');
  });

  it('generates and displays a link code only in memory', () => {
    const component = create();
    component['generateTelegramCode']();
    fixture.detectChanges();
    expect(service.generateMessagingLinkCode).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('482 913');
    expect(fixture.nativeElement.textContent).toContain('Expira em');
    expect(localStorage.getItem('userContactLinkCode')).toBeNull();
  });

  it('shows active and blocked Telegram account states', () => {
    service.getMyContact.mockReturnValueOnce(of({ ...emptyContact, messagingAccounts: [{ id: 9, channel: 'TELEGRAM', status: 'ACTIVE', username: 'breno', displayName: 'Breno', verifiedAt: '2026-07-23T00:00:00Z', createdAt: '2026-07-23T00:00:00Z' }] }));
    create();
    expect(fixture.nativeElement.textContent).toContain('Vinculado');
    expect(fixture.nativeElement.textContent).toContain('@breno');
  });

  it('confirms unlink and refreshes the contact', () => {
    service.getMyContact.mockReturnValue(of({ ...emptyContact, messagingAccounts: [{ id: 9, channel: 'TELEGRAM', status: 'ACTIVE', username: null, displayName: null, verifiedAt: null, createdAt: '2026-07-23T00:00:00Z' }] }));
    const component = create();
    component['openUnlinkConfirmation']();
    component['confirmUnlink']();
    expect(service.unlinkMessagingAccount).toHaveBeenCalledWith(9);
    expect(service.getMyContact).toHaveBeenCalledTimes(2);
  });
});
