import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GdFormControl, GdFormValue, Input } from '../../../shared/forms';
import { Button } from '../../../shared/ui';

@Component({ selector: 'gd-forgot-password-page', imports: [ReactiveFormsModule, Input, Button], templateUrl: './forgot-password-page.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  protected readonly loading = signal(false); protected readonly sent = signal(false);
  protected readonly form = new FormGroup<{email:GdFormControl}>({email:new FormControl<GdFormValue>('',{validators:[Validators.required,Validators.email]})});
  protected submit():void { if(this.form.invalid){this.form.markAllAsTouched();return;} this.loading.set(true); const email=`${this.form.controls.email.value ?? ''}`; this.auth.requestPasswordRecovery(email).pipe(finalize(()=>this.loading.set(false))).subscribe({next:()=>this.sent.set(true),error:()=>this.sent.set(true)}); }
  protected continue():void { void this.router.navigate(['/reset-password'], { state: { email: this.form.controls.email.value } }); }
}
