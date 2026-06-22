import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthResponse, ChangePasswordRequest, LoginRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>('/auth/logout', {});
  }

  session(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>('/auth/session');
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>('/auth/change-password', payload);
  }
}
