import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateMessagingLinkCodeRequest,
  MessagingLinkCodeResponse,
  UpdatePhoneRequest,
  UserContact,
} from '../models/user-contact.models';

@Injectable({ providedIn: 'root' })
export class UserContactService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getMyContact(): Observable<UserContact> {
    return this.http.get<UserContact>(`${this.apiUrl}/user-contact/me`);
  }

  updateMyPhone(phoneNumber: string): Observable<UserContact> {
    const payload: UpdatePhoneRequest = { phoneNumber };
    return this.http.put<UserContact>(`${this.apiUrl}/user-contact/me/phone`, payload);
  }

  generateMessagingLinkCode(): Observable<MessagingLinkCodeResponse> {
    const payload: CreateMessagingLinkCodeRequest = { channel: 'TELEGRAM' };
    return this.http.post<MessagingLinkCodeResponse>(
      `${this.apiUrl}/user-contact/me/messaging-link-codes`,
      payload,
    );
  }

  unlinkMessagingAccount(accountId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user-contact/me/messaging-accounts/${accountId}`);
  }
}
