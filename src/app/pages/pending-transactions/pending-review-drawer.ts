import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { ToastStore } from '../../core/stores/toast.store';

import { FinancialCategory } from '../../core/models/financial-category.models';
import { PendingFinancialTransaction } from '../../core/models/pending-financial-transaction.models';
import { FinancialCategoryService } from '../../core/services/financial-category.service';
import { PendingFinancialTransactionService } from '../../core/services/pending-financial-transaction.service';
import { GdFormValue, Input, Select, Textarea } from '../../shared/forms';
import { ConfirmDialog, Drawer } from '../../shared/overlays';
import { brazilianMoneyToNumber } from '../../shared/utils/money.utils';
import { Badge, Button, ErrorState, Skeleton } from '../../shared/ui';

@Component({
  selector: 'gd-pending-review-drawer',
  imports: [Badge, Button, ConfirmDialog, DatePipe, DecimalPipe, Drawer, ErrorState, Input, ReactiveFormsModule, Select, Skeleton, Textarea],
  template: `
    <gd-drawer [open]="open()" title="Revisar movimentação" description="Confira os dados identificados antes de incluir a movimentação no controle financeiro." size="lg" (closed)="closed.emit()">
      @if (loading()) { <div class="p-5"><gd-skeleton height="18rem" /></div> }
      @else if (error()) { <div class="p-5"><gd-error-state title="Não foi possível carregar a pendência" description="Tente novamente." actionLabel="Tentar novamente" (action)="retry()" /></div> }
      @else if (detail(); as item) { <div class="space-y-5 p-5"><section class="rounded-app bg-background p-4 text-sm"><h3 class="font-semibold">Dados de origem</h3><p class="mt-3 whitespace-pre-wrap">{{ item.sourceMessageContent }}</p><div class="mt-3 grid gap-2 sm:grid-cols-2"><p>Origem: Telegram</p><p>Recebida em: {{ item.sourceMessageReceivedAt | date:'dd/MM/yyyy HH:mm' }}</p><p>Usuário: {{ item.requestedByUserName }}</p><p>Fazenda: {{ item.farmName }}</p><p>Confiança: {{ item.confidence * 100 | number:'1.0-0' }}%</p><p>Categoria sugerida: {{ item.categoryName ?? item.rawCategoryName ?? 'Não identificada' }}</p></div></section>
        @if (item.status !== 'PENDING_REVIEW') { <gd-badge [variant]="item.status === 'APPROVED' ? 'success' : 'danger'">{{ item.status === 'APPROVED' ? 'Aprovada' : 'Rejeitada' }}</gd-badge><p class="text-sm">Revisada em: {{ item.reviewedAt | date:'dd/MM/yyyy HH:mm' }}</p>@if (item.rejectionReason) { <p class="text-sm">Motivo: {{ item.rejectionReason }}</p> } }
        @else { <form class="space-y-4" [formGroup]="form"><gd-select id="review-type" label="Tipo" [control]="form.controls.type" [options]="typeOptions" /><gd-input id="review-amount" label="Valor" [control]="form.controls.amount" inputmode="decimal" /><gd-input id="review-date" label="Data" type="date" [control]="form.controls.transactionDate" /><gd-select id="review-category" label="Categoria" [control]="form.controls.categoryId" [options]="categoryOptions()" /><gd-textarea id="review-description" label="Descrição" [control]="form.controls.description" /><gd-select id="review-payment-status" label="Situação" [control]="form.controls.paymentStatus" [options]="paymentStatusOptions" /> @if (form.controls.paymentStatus.value === 'PAID') { <gd-input id="review-paid-at" label="Data do pagamento" type="date" [control]="form.controls.paidAt" /> } @else { <gd-input id="review-due-date" label="Data de vencimento" type="date" [control]="form.controls.dueDate" /> }<gd-textarea id="review-rejection-reason" label="Motivo da rejeição" [control]="form.controls.rejectionReason" /></form><div class="flex flex-col gap-2 sm:flex-row sm:justify-end"><gd-button type="button" variant="danger" (click)="rejectConfirm.set(true)">Rejeitar</gd-button><gd-button type="button" variant="outline" [loading]="saving()" (click)="save()">Salvar alterações</gd-button><gd-button type="button" [loading]="approving()" (click)="approveConfirm.set(true)">Aprovar movimentação</gd-button></div> }
      </div> }
    </gd-drawer>
    <gd-confirm-dialog [open]="approveConfirm()" title="Aprovar movimentação?" description="Ela será incluída nos cálculos financeiros da fazenda." confirmLabel="Aprovar" [loading]="approving()" (confirmed)="approve()" (cancelled)="approveConfirm.set(false)" />
    <gd-confirm-dialog [open]="rejectConfirm()" title="Rejeitar movimentação?" description="A movimentação não será incluída nos cálculos financeiros." confirmLabel="Rejeitar" variant="danger" [loading]="rejecting()" (confirmed)="reject()" (cancelled)="rejectConfirm.set(false)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingReviewDrawer {
  private readonly service = inject(PendingFinancialTransactionService);
  private readonly categoriesService = inject(FinancialCategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastStore);
  readonly open = input(false);
  readonly pendingId = input<number | null>(null);
  readonly refreshed = output<PendingFinancialTransaction>();
  readonly decided = output<void>();
  readonly closed = output<void>();
  protected readonly detail = signal<PendingFinancialTransaction | null>(null);
  protected readonly categories = signal<FinancialCategory[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly saving = signal(false);
  protected readonly approving = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly approveConfirm = signal(false);
  protected readonly rejectConfirm = signal(false);
  protected readonly paymentStatusOptions = [{ label: 'Pago', value: 'PAID' }, { label: 'Pendente', value: 'PENDING' }];
  protected readonly typeOptions = [{ label: 'Receita', value: 'INCOME' }, { label: 'Despesa', value: 'EXPENSE' }];
  constructor() {
    effect(() => {
      const id = this.pendingId();
      if (this.open() && id !== null) {
        untracked(() => this.load(id));
      }
    });
  }

  protected readonly form = new FormGroup({ type: new FormControl<GdFormValue>('', Validators.required), amount: new FormControl<GdFormValue>('', Validators.required), transactionDate: new FormControl<GdFormValue>('', Validators.required), categoryId: new FormControl<GdFormValue>(''), description: new FormControl<GdFormValue>('', [Validators.required, Validators.maxLength(160)]), paymentStatus: new FormControl<GdFormValue>('PAID', Validators.required), paidAt: new FormControl<GdFormValue>(''), dueDate: new FormControl<GdFormValue>(''), rejectionReason: new FormControl<GdFormValue>('') });

  load(id: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.service.getById(id).pipe(
      switchMap((detail) => this.categoriesService.listByFarm(detail.farmId, { includeInactive: false, size: 100 }).pipe(
        switchMap((categories) => [{ detail, categories }]),
      )),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: ({ detail, categories }) => {
        this.detail.set(detail);
        this.categories.set(categories);
        this.form.reset({ type: detail.type, amount: detail.amount.toFixed(2).replace(".", ","), transactionDate: detail.transactionDate, categoryId: detail.categoryId ?? "", description: detail.description, paymentStatus: "PAID", paidAt: detail.transactionDate, dueDate: "", rejectionReason: "" });
      },
      error: () => this.error.set(true),
    });
  }

  protected retry(): void {
    const id = this.pendingId();
    if (id !== null) this.load(id);
  }

  protected categoryOptions(): { label: string; value: number }[] { return this.categories().filter((category) => category.status === 'ACTIVE' && category.type === this.form.controls.type.value).map((category) => ({ label: category.name, value: category.id })); }
  protected save(): void { const item = this.detail(); if (!item || !this.form.valid) return; this.saving.set(true); this.service.update(item.id, { type: this.form.controls.type.value as string, amount: brazilianMoneyToNumber(`${this.form.controls.amount.value}`) ?? 0, transactionDate: `${this.form.controls.transactionDate.value}`, categoryId: Number(this.form.controls.categoryId.value) || null, description: `${this.form.controls.description.value}`.trim() }).pipe(finalize(() => this.saving.set(false))).subscribe((value) => { this.detail.set(value); this.form.markAsPristine(); this.refreshed.emit(value); }); }
  protected approve(): void {
    const item = this.detail();
    const status = this.form.controls.paymentStatus.value;
    if (!item || (status === 'PENDING' && !this.form.controls.dueDate.value) || (status === 'PAID' && !this.form.controls.paidAt.value)) {
      return;
    }
    this.approving.set(true);
    const update = this.form.dirty
      ? this.service.update(item.id, { type: this.form.controls.type.value as string, amount: brazilianMoneyToNumber(String(this.form.controls.amount.value)) ?? 0, transactionDate: String(this.form.controls.transactionDate.value), categoryId: Number(this.form.controls.categoryId.value) || null, description: String(this.form.controls.description.value).trim() })
      : null;
    (update ? update.pipe(switchMap((value) => { this.detail.set(value); this.refreshed.emit(value); return this.service.approve(item.id, this.approvalRequest()); })) : this.service.approve(item.id, this.approvalRequest()))
      .pipe(finalize(() => this.approving.set(false)))
      .subscribe({ next: () => { this.approveConfirm.set(false); this.decided.emit(); }, error: (response) => this.handleDecisionError(response.status) });
  }
  private approvalRequest() {
    const status = this.form.controls.paymentStatus.value as 'PAID' | 'PENDING';
    return status === 'PAID'
      ? { status, paidAt: String(this.form.controls.paidAt.value || this.form.controls.transactionDate.value), dueDate: null }
      : { status, paidAt: null, dueDate: String(this.form.controls.dueDate.value) };
  }

  protected reject(): void { const item = this.detail(); if (!item) return; this.rejecting.set(true); this.service.reject(item.id, String(this.form.controls.rejectionReason.value || '').trim() || undefined).pipe(finalize(() => this.rejecting.set(false))).subscribe({ next: () => { this.rejectConfirm.set(false); this.decided.emit(); }, error: (response) => this.handleDecisionError(response.status) }); }

  private handleDecisionError(status: number): void {
    if (status === 409) { this.toast.error('Esta pendência já foi processada.'); }
    else if (status === 403) { this.toast.error('Você não tem permissão para concluir esta ação.'); }
    else if (status === 404) { this.closed.emit(); }
    else { this.toast.error('Não foi possível concluir a decisão.'); }
  }
}
