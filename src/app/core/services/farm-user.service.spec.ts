import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PageResponse } from "../models/page-response.model";

import {
  CreateFarmUserRequest,
  FarmUser,
  UpdateFarmUserRoleRequest,
} from '../models/farm-user.models';

import { FarmUserService } from './farm-user.service';

const farmUser: FarmUser = {
  id: 1,
  farmId: 10,
  farmName: 'Fazenda Boa Safra',
  userId: 20,
  userName: 'Maria Silva',
  userEmail: 'maria@example.com',
  role: 'EMPLOYEE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const pageResponse: PageResponse<FarmUser> = {
  content: [farmUser],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
};

describe("FarmUserService", () => {
  let service: FarmUserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FarmUserService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FarmUserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list users by farm', () => {
    service.listByFarm(10).subscribe((result) => expect(result).toEqual(pageResponse));

    const request = http.expectOne('http://localhost:8080/api/farms/10/users');
    expect(request.request.method).toBe('GET');
    request.flush(pageResponse);
  });

  it('should link a user to a farm', () => {
    const payload: CreateFarmUserRequest = { userId: 20, role: 'EMPLOYEE' };
    service.linkUser(10, payload).subscribe((result) => expect(result).toEqual(farmUser));

    const request = http.expectOne('http://localhost:8080/api/farms/10/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(farmUser);
  });

  it('should update a farm user role', () => {
    const payload: UpdateFarmUserRoleRequest = { role: 'ACCOUNTANT' };
    service.updateRole(10, 20, payload).subscribe((result) => expect(result).toEqual(farmUser));

    const request = http.expectOne('http://localhost:8080/api/farms/10/users/20/role');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush(farmUser);
  });

  it('should inactivate a farm user', () => {
    service.inactivate(10, 20).subscribe();

    const request = http.expectOne('http://localhost:8080/api/farms/10/users/20');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it("should send pagination and filters when listing users by farm", () => {
    service
      .listByFarm(10, { page: 1, size: 10, sort: "userName", direction: "ASC", search: " Maria ", role: "EMPLOYEE" })
      .subscribe();

    const request = http.expectOne((request) => request.url === "http://localhost:8080/api/farms/10/users");
    expect(request.request.method).toBe("GET");
    expect(request.request.params.get("page")).toBe("1");
    expect(request.request.params.get("size")).toBe("10");
    expect(request.request.params.get("sort")).toBe("userName");
    expect(request.request.params.get("direction")).toBe("ASC");
    expect(request.request.params.get("search")).toBe("Maria");
    expect(request.request.params.get("role")).toBe("EMPLOYEE");
    request.flush(pageResponse);
  });

  it("should omit empty list filters", () => {
    service.listByFarm(10, { search: "   ", role: null }).subscribe();

    const request = http.expectOne((request) => request.url === "http://localhost:8080/api/farms/10/users");
    expect(request.request.params.has("search")).toBe(false);
    expect(request.request.params.has("role")).toBe(false);
    request.flush(pageResponse);
  });

  it('should send repeated roles params and omit singular role', () => {
    service.listByFarm(10, { role: 'INACTIVE', roles: ['PRODUCER', 'EMPLOYEE'] }).subscribe();

    const request = http.expectOne((request) => request.url === 'http://localhost:8080/api/farms/10/users');
    expect(request.request.params.getAll('roles')).toEqual(['PRODUCER', 'EMPLOYEE']);
    expect(request.request.params.has('role')).toBe(false);
    request.flush(pageResponse);
  });

  it('should omit empty roles and keep singular role fallback', () => {
    service.listByFarm(10, { role: 'EMPLOYEE', roles: [] }).subscribe();

    const request = http.expectOne((request) => request.url === 'http://localhost:8080/api/farms/10/users');
    expect(request.request.params.has('roles')).toBe(false);
    expect(request.request.params.get('role')).toBe('EMPLOYEE');
    request.flush(pageResponse);
  });

});
