import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { finalize } from 'rxjs';

import { SystemStatus } from '../../core/models/system-status.models';
import { SystemStatusService } from '../../core/services/system-status.service';
import { Button } from '../../shared/ui';

@Component({
  selector: 'gd-server-error-page',
  imports: [Button, LucideDynamicIcon],
  templateUrl: './server-error-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  private readonly router = inject(Router);
  private readonly systemStatusService = inject(SystemStatusService);

  protected readonly retrying = signal(false);
  protected readonly message = signal<string | null>(null);

  protected retry(): void {
    this.retrying.set(true);
    this.message.set(null);

    this.systemStatusService
      .getStatus()
      .pipe(finalize(() => this.retrying.set(false)))
      .subscribe({
        next: (status) => this.handleStatus(status),
        error: () => {
          this.message.set('A API não respondeu. Verifique sua conexão e tente novamente.');
        },
      });
  }

  protected goHome(): void {
    void this.router.navigate(['/']);
  }

  private handleStatus(status: SystemStatus): void {
    if (this.systemStatusService.isHealthy(status)) {
      void this.router.navigate(['/dashboard']);
      return;
    }

    if (status.database !== 'UP') {
      this.message.set('O banco de dados está indisponível no momento. Tente novamente em instantes.');
      return;
    }

    this.message.set('O servidor está instável no momento. Tente novamente em instantes.');
  }
}
