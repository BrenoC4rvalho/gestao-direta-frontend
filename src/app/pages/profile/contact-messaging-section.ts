import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import { MessagingAccount, MessagingAccountStatus, PhoneVerificationStatus, UserContact } from '../../core/models/user-contact.models';
import { UserContactService } from '../../core/services/user-contact.service';
import { ToastStore } from '../../core/stores/toast.store';
import { GdFormControl, GdFormValue, Input } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { Badge, BadgeVariant, Button, Card, ErrorState, Skeleton } from '../../shared/ui';
import { formatBrazilianPhone, formatBrazilianPhoneInput, isPhoneInputCharacterSetValid, normalizeBrazilianPhone, phoneDigits } from './phone.utils';

interface PhoneFormControls {
  phone: GdFormControl;
}

@Component({
  selector: 'gd-contact-messaging-section',
  imports: [
    Badge,
    Button,
    Card,
    ConfirmDialog,
    Drawer,
    ErrorState,
    Input,
    LucideDynamicIcon,
    ReactiveFormsModule,
    Skeleton,
  ],
  templateUrl: './contact-messaging-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactMessagingSection {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userContactService = inject(UserContactService);
  private readonly toastStore = inject(ToastStore);
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pendingPhone = signal<string | null>(null);

  protected readonly contact = signal<UserContact | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly savingPhone = signal(false);
  protected readonly generatingCode = signal(false);
  protected readonly unlinkingAccountId = signal<number | null>(null);
  protected readonly drawerOpen = signal(false);
  protected readonly codeDrawerOpen = signal(false);
  protected readonly confirmChangeOpen = signal(false);
  protected readonly confirmUnlinkOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly linkCode = signal<{ code: string; expiresAt: string } | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly formatBrazilianPhone = formatBrazilianPhone;
  protected readonly telegramAccount = computed(() =>
    this.contact()?.messagingAccounts.find((account) => account.channel === 'TELEGRAM') ?? null,
  );
  protected readonly codeExpired = computed(() => {
    const linkCode = this.linkCode();
    return !linkCode || new Date(linkCode.expiresAt).getTime() <= this.now();
  });
  protected readonly codeExpiryLabel = computed(() => {
    const linkCode = this.linkCode();
    if (!linkCode || this.codeExpired()) return 'Código expirado';
    const remainingSeconds = Math.max(0, Math.ceil((new Date(linkCode.expiresAt).getTime() - this.now()) / 1000));
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `Expira em ${minutes}:${seconds}`;
  });
  protected readonly phoneForm = new FormGroup<PhoneFormControls>({
    phone: new FormControl<GdFormValue>('', { validators: [this.phoneValidator()] }),
  });

  constructor() {
    this.phoneForm.controls.phone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applyPhoneMask(value));
    this.destroyRef.onDestroy(() => this.stopCountdown());
    this.loadContact();
  }

  protected loadContact(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.userContactService
      .getMyContact()
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contact) => this.contact.set(contact),
        error: () => this.loadError.set(true),
      });
  }

  protected openPhoneDrawer(): void {
    const contact = this.contact();
    if (!contact || this.savingPhone()) return;
    this.editing.set(contact.phoneNumber !== null);
    this.pendingPhone.set(null);
    this.phoneForm.reset({ phone: contact.phoneNumber ? formatBrazilianPhone(contact.phoneNumber) : '' });
    this.drawerOpen.set(true);
    setTimeout(() => this.focusPhoneInput());
  }

  protected closePhoneDrawer(): void {
    if (this.savingPhone()) return;
    this.drawerOpen.set(false);
    this.confirmChangeOpen.set(false);
    this.pendingPhone.set(null);
  }

  protected submitPhone(): void {
    if (this.savingPhone()) return;
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    const phone = normalizeBrazilianPhone(this.phoneForm.controls.phone.value);
    const currentPhone = this.contact()?.phoneNumber;
    if (!phone) return;
    if (currentPhone && currentPhone !== phone) {
      this.pendingPhone.set(phone);
      this.confirmChangeOpen.set(true);
      return;
    }
    this.savePhone(phone);
  }

  protected confirmPhoneChange(): void {
    const phone = this.pendingPhone();
    if (phone) this.savePhone(phone);
    this.confirmChangeOpen.set(false);
  }

  protected cancelPhoneChange(): void {
    this.confirmChangeOpen.set(false);
    this.pendingPhone.set(null);
  }

  protected generateTelegramCode(): void {
    if (this.generatingCode() || this.telegramAccount()?.status === 'BLOCKED') return;
    this.generatingCode.set(true);
    this.userContactService
      .generateMessagingLinkCode()
      .pipe(finalize(() => this.generatingCode.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.linkCode.set({ code: response.code, expiresAt: response.expiresAt });
          this.codeDrawerOpen.set(true);
          this.startCountdown();
        },
        error: (error: unknown) => this.toastStore.error(this.codeErrorMessage(error)),
      });
  }

  protected closeCodeDrawer(): void {
    this.codeDrawerOpen.set(false);
    this.stopCountdown();
  }

  protected refreshContact(): void {
    this.loading.set(false);
    this.loadContact();
  }

  protected openUnlinkConfirmation(): void {
    if (this.unlinkingAccountId() !== null) return;
    this.confirmUnlinkOpen.set(true);
  }

  protected cancelUnlink(): void {
    if (this.unlinkingAccountId() === null) this.confirmUnlinkOpen.set(false);
  }

  protected confirmUnlink(): void {
    const account = this.telegramAccount();
    if (!account || this.unlinkingAccountId() !== null) return;
    this.unlinkingAccountId.set(account.id);
    this.userContactService
      .unlinkMessagingAccount(account.id)
      .pipe(finalize(() => this.unlinkingAccountId.set(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirmUnlinkOpen.set(false);
          this.toastStore.success('Conta do Telegram desvinculada com sucesso.');
          this.refreshContact();
        },
        error: () => this.toastStore.error('Não foi possível desvincular a conta do Telegram.'),
      });
  }

  protected async copyCode(): Promise<void> {
    const code = this.linkCode()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/vincular ${code}`);
      this.toastStore.success('Comando copiado para a área de transferência.');
    } catch {
      this.toastStore.error('Não foi possível copiar o comando.');
    }
  }

  protected phoneStatusLabel(status: PhoneVerificationStatus): string {
    return { NOT_INFORMED: 'Não informado', PENDING: 'Pendente', VERIFIED: 'Verificado', EXPIRED: 'Expirado', BLOCKED: 'Bloqueado' }[status];
  }

  protected phoneStatusVariant(status: PhoneVerificationStatus): BadgeVariant {
    const variants: Record<PhoneVerificationStatus, BadgeVariant> = { NOT_INFORMED: 'neutral', PENDING: 'warning', VERIFIED: 'success', EXPIRED: 'warning', BLOCKED: 'danger' };
    return variants[status];
  }

  protected accountStatusLabel(status: MessagingAccountStatus): string {
    return { PENDING: 'Pendente', ACTIVE: 'Vinculado', INACTIVE: 'Inativo', BLOCKED: 'Bloqueado' }[status];
  }

  protected accountStatusVariant(status: MessagingAccountStatus): BadgeVariant {
    const variants: Record<MessagingAccountStatus, BadgeVariant> = { PENDING: 'warning', ACTIVE: 'success', INACTIVE: 'neutral', BLOCKED: 'danger' };
    return variants[status];
  }

  protected accountDescription(account: MessagingAccount | null): string {
    if (!account) return 'Vincule sua conta ao bot do Gestão Direta para utilizar comandos e selecionar sua fazenda.';
    if (account.status === 'BLOCKED') return 'A conta de mensagens está bloqueada. Entre em contato com um administrador.';
    if (account.status === 'INACTIVE') return 'Esta conta está inativa. Entre em contato com um administrador caso precise de ajuda.';
    return 'Use o bot do Gestão Direta para comandos e seleção da sua fazenda.';
  }

  protected formatCode(code: string): string {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }

  protected formatDate(value: string | null): string | null {
    if (!value) return null;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
  }

  protected phoneErrorMessage(): string | null {
    const control = this.phoneForm.controls.phone;
    if (control.hasError('required')) return 'Informe seu telefone.';
    if (control.hasError('characters')) return 'Use apenas números, espaços, parênteses e hífen.';
    if (control.hasError('countryCode')) return 'Informe o código do país +55.';
    return control.hasError('phoneLength') ? 'Informe um telefone brasileiro completo com DDD.' : null;
  }

  private savePhone(phone: string): void {
    this.savingPhone.set(true);
    this.userContactService
      .updateMyPhone(phone)
      .pipe(finalize(() => this.savingPhone.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contact) => {
          this.contact.set(contact);
          this.drawerOpen.set(false);
          this.pendingPhone.set(null);
          this.toastStore.success('Telefone atualizado com sucesso.');
        },
        error: (error: unknown) => this.toastStore.error(this.phoneSaveErrorMessage(error)),
      });
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.now.set(Date.now());
    this.countdownTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
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
    if (control.value !== formattedValue) control.setValue(formattedValue, { emitEvent: false });
  }

  private focusPhoneInput(): void {
    const phoneInput = this.document.getElementById('contact-phone');
    if (phoneInput instanceof HTMLInputElement) phoneInput.focus();
  }

  private phoneSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) return 'Não foi possível atualizar o telefone.';
    return 'Não foi possível atualizar o telefone.';
  }

  private codeErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 429) return 'Aguarde alguns minutos antes de gerar um novo código.';
    if (error instanceof HttpErrorResponse && error.status === 409) return 'Já existe uma conta do Telegram vinculada.';
    return 'Não foi possível gerar o código de vinculação.';
  }
}
