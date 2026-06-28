import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PageResponse } from '../models/page-response.model';
import {
  CreateUserRequest,
  ResetUserPasswordRequest,
  UpdateProfileRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UpdateUserTypeRequest,
  User,
} from '../models/user.models';

import { UserService } from './user.service';

const user: User = {
  id: 1,
  name: 'Maria Silva',
  email: 'maria@example.com',
  document: null,
  userType: 'ADMIN',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-10T00:00:00Z',
};

const response: PageResponse<User> = {
  content: [user],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should call GET /api/users', () => {
    service.list().subscribe((result) => expect(result).toEqual(response));

    const request = http.expectOne('http://localhost:8080/api/users');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('should search a user by email', () => {
    service.searchByEmail('user@email.com').subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne(
      'http://localhost:8080/api/users/search-by-email?email=user@email.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush(user);
  });

  it('should trim email when searching a user', () => {
    service.searchByEmail(' user@email.com ').subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne(
      'http://localhost:8080/api/users/search-by-email?email=user@email.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush(user);
  });

  it('should call POST /api/users with the payload', () => {
    const payload: CreateUserRequest = {
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'password123',
      document: null,
      userType: 'USER',
    };

    service.create(payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should call GET /api/users/me', () => {
    service.getMe().subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/me');
    expect(request.request.method).toBe('GET');
    request.flush(user);
  });

  it('should call PUT /api/users/me with only profile fields', () => {
    const payload: UpdateProfileRequest = {
      name: 'Maria Silva',
      document: '12345678900',
    };

    service.updateMe(payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should call PUT /api/users/{id} with profile fields', () => {
    const payload: UpdateUserRequest = {
      name: 'Maria Silva',
      document: '12345678900',
    };

    service.update(2, payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should call PATCH /api/users/{id}/status with the payload', () => {
    const payload: UpdateUserStatusRequest = { status: 'BLOCKED' };

    service.updateStatus(2, payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/2/status');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should call PATCH /api/users/{id}/type with the payload', () => {
    const payload: UpdateUserTypeRequest = { userType: 'ADMIN' };

    service.updateType(2, payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/2/type');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should call PATCH /api/users/{id}/reset-password with only the new password payload', () => {
    const payload: ResetUserPasswordRequest = { newPassword: 'NewPassword@123' };

    service.resetPassword(2, payload).subscribe((result) => expect(result).toEqual(user));

    const request = http.expectOne('http://localhost:8080/api/users/2/reset-password');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush(user);
  });

  it('should send pagination params', () => {
    service.list({ page: 0, size: 10, sort: 'name', direction: 'ASC' }).subscribe();

    const request = http.expectOne(
      'http://localhost:8080/api/users?page=0&size=10&sort=name&direction=ASC',
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });
});
