import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthResponse } from '../models/auth.models';

import { AuthService } from './auth.service';

const apiUrl = 'http://localhost:8080/api';

const authResponse: AuthResponse = {
  user: {
    id: 1,
    name: 'Maria Silva',
    email: 'maria@example.com',
    document: null,
    userType: 'ADMIN',
    status: 'ACTIVE',
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call POST /api/auth/login', () => {
    service.login({ email: 'maria@example.com', password: 'secret' }).subscribe((response) => {
      expect(response).toEqual(authResponse);
    });

    const request = http.expectOne(apiUrl + '/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'maria@example.com', password: 'secret' });
    request.flush(authResponse);
  });

  it('should call POST /api/auth/logout', () => {
    service.logout().subscribe((response) => {
      expect(response).toBeNull();
    });

    const request = http.expectOne(apiUrl + '/auth/logout');
    expect(request.request.method).toBe('POST');
    request.flush(null);
  });

  it('should call GET /api/auth/session', () => {
    service.session().subscribe((response) => {
      expect(response).toEqual(authResponse);
    });

    const request = http.expectOne(apiUrl + '/auth/session');
    expect(request.request.method).toBe('GET');
    request.flush(authResponse);
  });

  it('should call POST /api/auth/change-password', () => {
    const payload = {
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
      confirmPassword: 'new-secret',
    };

    service.changePassword(payload).subscribe((response) => {
      expect(response).toBeNull();
    });

    const request = http.expectOne(apiUrl + '/auth/change-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(null);
  });
});
