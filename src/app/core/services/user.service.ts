import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page-response.model';
import {
  CreateUserRequest,
  ResetUserPasswordRequest,
  UpdateProfileRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UpdateUserTypeRequest,
  User,
  UserListParams,
} from '../models/user.models';
import { appendQueryParam } from '../../shared/utils/query-params.utils';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(params?: UserListParams): Observable<PageResponse<User>> {
    return this.http.get<PageResponse<User>>(`${this.apiUrl}/users`, {
      params: this.buildParams(params),
    });
  }

  searchByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/search-by-email`, {
      params: new HttpParams().set('email', email.trim()),
    });
  }

  create(payload: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, payload);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`);
  }

  updateMe(payload: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/me`, payload);
  }

  update(id: number, payload: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, payload);
  }

  updateStatus(id: number, payload: UpdateUserStatusRequest): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/status`, payload);
  }

  updateType(id: number, payload: UpdateUserTypeRequest): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/type`, payload);
  }

  resetPassword(id: number, payload: ResetUserPasswordRequest): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/reset-password`, payload);
  }

  private buildParams(params?: UserListParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    httpParams = appendQueryParam(httpParams, 'page', params.page);
    httpParams = appendQueryParam(httpParams, 'size', params.size);
    httpParams = appendQueryParam(httpParams, 'sort', params.sort);
    httpParams = appendQueryParam(httpParams, 'direction', params.direction);
    httpParams = appendQueryParam(httpParams, 'search', params.search);
    httpParams = appendQueryParam(httpParams, 'userType', params.userType);

    if (params.statuses?.length) {
      httpParams = appendQueryParam(httpParams, 'statuses', params.statuses);
    } else {
      httpParams = appendQueryParam(httpParams, 'status', params.status);
    }

    return httpParams;
  }
}
