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
import { UserOption } from '../models/user.models';
import { appendQueryParam } from '../../shared/utils/query-params.utils';

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

  listUserOptions(farmId: number): Observable<UserOption[]> {
    return this.http.get<UserOption[]>(`${this.apiUrl}/farms/${farmId}/users/options`);
  }

  private buildParams(params?: FarmUserListParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    httpParams = appendQueryParam(httpParams, 'page', params.page);
    httpParams = appendQueryParam(httpParams, 'size', params.size);
    httpParams = appendQueryParam(httpParams, 'sort', params.sort);
    httpParams = appendQueryParam(httpParams, 'direction', params.direction);
    httpParams = appendQueryParam(httpParams, 'search', params.search);

    if (params.roles?.length) {
      httpParams = appendQueryParam(httpParams, 'roles', params.roles);
    } else {
      httpParams = appendQueryParam(httpParams, 'role', params.role);
    }

    return httpParams;
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
