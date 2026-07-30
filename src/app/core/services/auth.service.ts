import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  PasswordRecoveryVerifyResponse,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  requestPasswordRecovery(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/auth/password-recovery/requests`, { email }, { responseType: 'text' });
  }

  verifyPasswordRecoveryCode(
    email: string,
    code: string,
  ): Observable<PasswordRecoveryVerifyResponse> {
    return this.http.post<PasswordRecoveryVerifyResponse>(
      `${this.apiUrl}/auth/password-recovery/verify`,
      { email, code },
    );
  }

  resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/auth/password-recovery/reset`,
      { resetToken, newPassword, confirmPassword },
      { responseType: 'text' },
    );
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {});
  }

  session(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiUrl}/auth/session`);
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, payload);
  }
}
