import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FarmAccessResponse } from '../models/farm-access.models';

@Injectable({
  providedIn: 'root',
})
export class FarmAccessService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAccess(farmId: number): Observable<FarmAccessResponse> {
    return this.http.get<FarmAccessResponse>(`${this.apiUrl}/farms/${farmId}/access`);
  }
}
