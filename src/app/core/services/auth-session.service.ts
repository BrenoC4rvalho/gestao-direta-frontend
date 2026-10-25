import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SessionResetService } from './session-reset.service';
import { ToastStore } from '../stores/toast.store';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly router = inject(Router);
  private readonly sessionReset = inject(SessionResetService);
  private readonly toastStore = inject(ToastStore);
  private handlingUnauthorized = false;

  expire(): void {
    if (this.handlingUnauthorized) {
      return;
    }

    this.handlingUnauthorized = true;
    this.sessionReset.clear();
    this.toastStore.error('Sua sessão expirou. Faça login novamente.');

    if (this.router.url.startsWith('/login')) {
      this.handlingUnauthorized = false;
      return;
    }

    void this.router.navigate(['/login']).finally(() => {
      this.handlingUnauthorized = false;
    });
  }
}
