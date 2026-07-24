import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UserContact } from '../models/user-contact.models';
import { UserContactService } from './user-contact.service';

const contact: UserContact = {
  id: 1,
  phoneNumber: null,
  phoneVerificationStatus: 'NOT_INFORMED',
  phoneVerifiedAt: null,
  preferredChannel: 'NONE',
  status: 'PENDING',
  messagingAccounts: [],
};

describe('UserContactService', () => {
  let service: UserContactService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UserContactService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the authenticated contact without duplicating /api', () => {
    service.getMyContact().subscribe((result) => expect(result).toEqual(contact));
    const request = http.expectOne('http://localhost:8080/api/user-contact/me');
    expect(request.request.method).toBe('GET');
    request.flush(contact);
  });

  it('updates the phone with a typed body', () => {
    service.updateMyPhone('+5524999999999').subscribe((result) => expect(result).toEqual(contact));
    const request = http.expectOne('http://localhost:8080/api/user-contact/me/phone');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ phoneNumber: '+5524999999999' });
    request.flush(contact);
  });

  it('creates a Telegram link code', () => {
    service.generateMessagingLinkCode().subscribe();
    const request = http.expectOne('http://localhost:8080/api/user-contact/me/messaging-link-codes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ channel: 'TELEGRAM' });
    request.flush({ code: '482913', channel: 'TELEGRAM', expiresAt: '2026-07-23T23:30:00Z' });
  });

  it('unlinks the supplied messaging account id', () => {
    service.unlinkMessagingAccount(12).subscribe();
    const request = http.expectOne('http://localhost:8080/api/user-contact/me/messaging-accounts/12');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
