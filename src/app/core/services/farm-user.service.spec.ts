import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

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

describe('FarmUserService', () => {
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
    service.listByFarm(10).subscribe((result) => expect(result).toEqual([farmUser]));

    const request = http.expectOne('http://localhost:8080/api/farms/10/users');
    expect(request.request.method).toBe('GET');
    request.flush([farmUser]);
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
});
