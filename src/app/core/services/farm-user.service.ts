import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFarmUserRequest,
  FarmUser,
  FarmUserListParams,
  UpdateFarmUserRoleRequest,
} from '../models/farm-user.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class FarmUserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(farmId: number, params?: FarmUserListParams): Observable<PageResponse<FarmUser>> {
    return this.http.get<PageResponse<FarmUser>>(this.apiUrl + '/farms/' + farmId + '/users', {
      params: this.buildParams(params),
    });
  }

  private buildParams(params?: FarmUserListParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }

    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }

    if (params.direction) {
      httpParams = httpParams.set('direction', params.direction);
    }

    httpParams = this.setOptionalParam(httpParams, 'search', params.search);
    httpParams = this.setOptionalParam(httpParams, 'role', params.role);

    return httpParams;
  }

  private setOptionalParam(
    httpParams: HttpParams,
    key: string,
    value: string | null | undefined,
  ): HttpParams {
    const normalized = value?.trim() ?? '';
    return normalized ? httpParams.set(key, normalized) : httpParams;
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
