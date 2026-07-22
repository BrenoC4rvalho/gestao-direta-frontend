import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { timer } from 'rxjs';

import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, Input } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card } from '../../shared/ui';
import { mockUserContact } from './mock-user-contact';
import { formatBrazilianPhone, formatBrazilianPhoneInput, isPhoneInputCharacterSetValid, normalizeBrazilianPhone, phoneDigits } from './phone.utils';
import { PhoneVerificationStatus, UserContact } from './user-contact.models';

interface PhoneFormControls { phone: GdFormControl; }

interface MessagingChannel {
  name: 'Telegram' | 'WhatsApp';
  status: string;
  description: string;
  actionLabel: string;
}

@Component({
  selector: 'gd-contact-messaging-section',
  imports: [Badge, Button, Card, ConfirmDialog, Drawer, Input, LucideDynamicIcon, ReactiveFormsModule],
  templateUrl: './contact-messaging-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactMessagingSection {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastStore = inject(ToastStore);

  protected readonly contact = signal<UserContact>({ ...mockUserContact });
  protected readonly formatBrazilianPhone = formatBrazilianPhone;
  protected readonly drawerOpen = signal(false);
  protected readonly confirmChangeOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  private readonly pendingPhone = signal<string | null>(null);
  protected readonly channels: readonly MessagingChannel[] = [
    { name: 'Telegram', status: 'Não vinculado', description: 'Vincule sua conta para usar o bot do Gestão Direta.', actionLabel: 'Configurar em breve' },
    { name: 'WhatsApp', status: 'Indisponível', description: 'A integração será disponibilizada futuramente.', actionLabel: 'Em breve' },
  ];
  protected readonly phoneForm = new FormGroup<PhoneFormControls>({
    phone: new FormControl<GdFormValue>('', { validators: [this.phoneValidator()] }),
  });

  constructor() {
    this.phoneForm.controls.phone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyPhoneMask(value));
  }

  protected openPhoneDrawer(): void {
    if (this.saving()) return;
    const currentPhone = this.contact().phoneNumber;
    this.editing.set(currentPhone !== null);
    this.pendingPhone.set(null);
    this.phoneForm.reset({ phone: currentPhone ? formatBrazilianPhone(currentPhone) : '' });
    this.drawerOpen.set(true);
    setTimeout(() => this.focusPhoneInput());
  }

  protected closePhoneDrawer(): void {
    if (this.saving()) return;
    this.drawerOpen.set(false);
    this.confirmChangeOpen.set(false);
    this.pendingPhone.set(null);
  }

  protected submitPhone(): void {
    if (this.saving()) return;
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    const normalizedPhone = normalizeBrazilianPhone(this.phoneForm.controls.phone.value);
    if (!normalizedPhone) return;
    const currentPhone = this.contact().phoneNumber;
    if (currentPhone && currentPhone !== normalizedPhone) {
      this.pendingPhone.set(normalizedPhone);
      this.confirmChangeOpen.set(true);
      return;
    }
    this.savePhone(normalizedPhone);
  }

  protected confirmPhoneChange(): void {
    const phone = this.pendingPhone();
    if (!phone) return;
    this.confirmChangeOpen.set(false);
    this.savePhone(phone);
  }

  protected cancelPhoneChange(): void {
    this.confirmChangeOpen.set(false);
    this.pendingPhone.set(null);
  }

  protected phoneStatusLabel(status: PhoneVerificationStatus): string {
    return { NOT_INFORMED: 'Não informado', PENDING: 'Pendente', VERIFIED: 'Verificado', EXPIRED: 'Expirado', BLOCKED: 'Bloqueado' }[status];
  }

  protected phoneStatusVariant(status: PhoneVerificationStatus): BadgeVariant {
    const variants: Record<PhoneVerificationStatus, BadgeVariant> = {
      NOT_INFORMED: 'neutral',
      PENDING: 'warning',
      VERIFIED: 'success',
      EXPIRED: 'warning',
      BLOCKED: 'danger',
    };

    return variants[status];
  }

  protected phoneErrorMessage(): string | null {
    const control = this.phoneForm.controls.phone;
    if (control.hasError('required')) return 'Informe seu telefone.';
    if (control.hasError('characters')) return 'Use apenas números, espaços, parênteses e hífen.';
    if (control.hasError('countryCode')) return 'Informe o código do país +55.';
    return control.hasError('phoneLength') ? 'Informe um telefone brasileiro completo com DDD.' : null;
  }

  private savePhone(phoneNumber: string): void {
    this.saving.set(true);
    timer(600).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.contact.update((contact) => ({ ...contact, phoneNumber, phoneVerificationStatus: 'PENDING', phoneVerifiedAt: null }));
      this.saving.set(false);
      this.drawerOpen.set(false);
      this.pendingPhone.set(null);
      this.toastStore.success('Telefone atualizado com sucesso.');
    });
  }

  private phoneValidator(): (control: AbstractControl<GdFormValue>) => ValidationErrors | null {
    return (control) => {
      const rawValue = `${control.value ?? ''}`;
      const value = rawValue.trim();
      if (!value) return { required: true };
      if (!isPhoneInputCharacterSetValid(rawValue)) return { characters: true };
      if (!value.startsWith('+55')) return { countryCode: true };
      return normalizeBrazilianPhone(rawValue) && phoneDigits(rawValue).length === 13 ? null : { phoneLength: true };
    };
  }

  private applyPhoneMask(value: GdFormValue): void {
    const control = this.phoneForm.controls.phone;
    const formattedValue = formatBrazilianPhoneInput(value);
    if (control.value !== formattedValue) {
      control.setValue(formattedValue, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private focusPhoneInput(): void {
    const phoneInput = this.document.getElementById('contact-phone');
    if (phoneInput instanceof HTMLInputElement) phoneInput.focus();
  }
}
