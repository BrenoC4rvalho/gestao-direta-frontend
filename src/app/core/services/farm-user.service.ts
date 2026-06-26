import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFarmUserRequest,
  FarmUser,
  UpdateFarmUserRoleRequest,
} from '../models/farm-user.models';

@Injectable({
  providedIn: 'root',
})
export class FarmUserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(farmId: number): Observable<FarmUser[]> {
    return this.http.get<FarmUser[]>(`${this.apiUrl}/farms/${farmId}/users`);
  }

  linkUser(farmId: number, payload: CreateFarmUserRequest): Observable<FarmUser> {
    return this.http.post<FarmUser>(`${this.apiUrl}/farms/${farmId}/users`, payload);
  }

  updateRole(
    farmId: number,
    userId: number,
    payload: UpdateFarmUserRoleRequest,
  ): Observable<FarmUser> {
    return this.http.patch<FarmUser>(
      `${this.apiUrl}/farms/${farmId}/users/${userId}/role`,
      payload,
    );
  }

  inactivate(farmId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/farms/${farmId}/users/${userId}`);
  }
}
