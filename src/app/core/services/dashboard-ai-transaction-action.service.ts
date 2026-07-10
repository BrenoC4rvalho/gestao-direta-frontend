import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DashboardAiTransactionActionService {
  private readonly openRequests = signal(0);

  readonly openRequest = computed(() => this.openRequests());

  requestOpen(): void {
    this.openRequests.update((value) => value + 1);
  }
}
