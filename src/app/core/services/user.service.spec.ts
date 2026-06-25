import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PageResponse } from '../models/page-response.model';
import { User } from '../models/user.models';

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

  it('should send pagination params', () => {
    service.list({ page: 0, size: 10, sort: 'name', direction: 'ASC' }).subscribe();

    const request = http.expectOne(
      'http://localhost:8080/api/users?page=0&size=10&sort=name&direction=ASC',
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });
});
