import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaymentStatus, UpcomingBill } from '../models/financial.models';
import { PageRequest, PageResponse } from '../models/page-response.model';

export type UpcomingBillPage = PageResponse<UpcomingBill>;

export interface UpcomingBillListParams extends PageRequest {
  status?: PaymentStatus | null;
}

@Injectable({
  providedIn: 'root',
})
export class UpcomingBillService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(farmId: number, params: UpcomingBillListParams = {}): Observable<UpcomingBillPage> {
    return this.http.get<UpcomingBillPage>(`${this.apiUrl}/financial/upcoming-bills`, {
      params: new HttpParams()
        .set('farmId', farmId)
        .set('page', params.page ?? 0)
        .set('size', params.size ?? 10)
        .set('sort', params.sort ?? 'dueDate')
        .set('direction', params.direction ?? 'ASC'),
    });
  }
}
