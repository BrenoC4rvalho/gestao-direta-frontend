import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FarmAccessResponse } from '../models/farm-access.models';

import { FarmAccessService } from './farm-access.service';

const access: FarmAccessResponse = {
  farmId: 1,
  farmName: 'Fazenda Boa Safra',
  userId: 2,
  userType: 'USER',
  role: 'PRODUCER',
  permissions: {
    canViewFarm: true,
    canEditFarm: true,
    canChangeFarmStatus: false,
    canManageFarmUsers: true,
    canViewFinancial: true,
    canManageTransactions: true,
    canManageCategories: true,
    canManageGlobalCategories: false,
    canCreateFarm: false,
  },
};

describe('FarmAccessService', () => {
  let service: FarmAccessService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FarmAccessService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FarmAccessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should get the access context for a farm', () => {
    service.getAccess(1).subscribe((response) => expect(response).toEqual(access));

    const request = http.expectOne('http://localhost:8080/api/farms/1/access');
    expect(request.request.method).toBe('GET');
    request.flush(access);
  });
});
