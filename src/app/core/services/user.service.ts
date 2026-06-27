import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageRequest, PageResponse } from '../models/page-response.model';
import {
  CreateUserRequest,
  UpdateProfileRequest,
  UpdateUserStatusRequest,
  UpdateUserTypeRequest,
  User,
} from '../models/user.models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(params?: PageRequest): Observable<PageResponse<User>> {
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

  updateStatus(id: number, payload: UpdateUserStatusRequest): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/status`, payload);
  }

  updateType(id: number, payload: UpdateUserTypeRequest): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/type`, payload);
  }

  private buildParams(params?: PageRequest): HttpParams {
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

    return httpParams;
  }
}
