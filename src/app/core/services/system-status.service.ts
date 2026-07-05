import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SystemStatus } from '../models/system-status.models';

@Injectable({
  providedIn: 'root',
})
export class SystemStatusService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStatus(): Observable<SystemStatus> {
    return this.http.get<SystemStatus>(`${this.apiUrl}/system/status`);
  }

  isHealthy(status: SystemStatus): boolean {
    return status.status === 'UP' && status.database === 'UP';
  }
}
