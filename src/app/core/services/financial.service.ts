import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FinancialAlerts,
  FinancialSummary,
  FinancialTransaction,
  UpcomingBill,
} from '../models/financial.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class FinancialService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSummary(farmId: number): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(`${this.apiUrl}/financial/summary`, {
      params: new HttpParams().set('farmId', farmId),
    });
  }

  getAlerts(farmId: number): Observable<FinancialAlerts> {
    return this.http.get<FinancialAlerts>(`${this.apiUrl}/financial/alerts`, {
      params: new HttpParams().set('farmId', farmId),
    });
  }

  getLatestTransactions(farmId: number): Observable<PageResponse<FinancialTransaction>> {
    return this.http.get<PageResponse<FinancialTransaction>>(
      `${this.apiUrl}/financial/transactions`,
      {
        params: new HttpParams()
          .set('farmId', farmId)
          .set('page', 0)
          .set('size', 5)
          .set('sort', 'transactionDate')
          .set('direction', 'DESC'),
      },
    );
  }

  getUpcomingBills(farmId: number): Observable<PageResponse<UpcomingBill>> {
    return this.http.get<PageResponse<UpcomingBill>>(
      `${this.apiUrl}/financial/upcoming-bills`,
      {
        params: new HttpParams()
          .set('farmId', farmId)
          .set('page', 0)
          .set('size', 5)
          .set('sort', 'dueDate')
          .set('direction', 'ASC'),
      },
    );
  }
}
