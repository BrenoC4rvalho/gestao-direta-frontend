import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CashFlowResponse,
  FinancialAlerts,
  FinancialSummary,
  FinancialTransaction,
  UpcomingBill,
} from '../models/financial.models';
import { PageResponse } from '../models/page-response.model';
import {
  FinancialReportRequest,
  FinancialReportResponse,
  FinancialReportTransaction,
  FinancialReportTransactionsRequest,
} from '../models/financial-report.models';

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

  getCashFlow(farmId: number, year: number): Observable<CashFlowResponse> {
    return this.http.get<CashFlowResponse>(`${this.apiUrl}/financial/cash-flow`, {
      params: new HttpParams().set('farmId', farmId).set('year', year),
    });
  }

  getLatestTransactions(farmId: number): Observable<PageResponse<FinancialTransaction>> {
    return this.http.get<PageResponse<FinancialTransaction>>(
      `${this.apiUrl}/financial/transactions`,
      {
        params: new HttpParams()
          .set('farmId', farmId)
          .set('page', 0)
          .set('size', 10)
          .set('sort', 'transactionDate')
          .set('direction', 'DESC'),
      },
    );
  }

  getFinancialReport(filters: FinancialReportRequest): Observable<FinancialReportResponse> {
    return this.http.get<FinancialReportResponse>(`${this.apiUrl}/financial/reports`, {
      params: this.buildReportParams(filters),
    });
  }

  getFinancialReportTransactions(
    filters: FinancialReportTransactionsRequest,
  ): Observable<PageResponse<FinancialReportTransaction>> {
    let params = this.buildReportParams(filters);
    params = params
      .set('page', filters.page)
      .set('size', filters.size)
      .set('sort', filters.sort)
      .set('direction', filters.direction);
    return this.http.get<PageResponse<FinancialReportTransaction>>(
      `${this.apiUrl}/financial/reports/transactions`,
      { params },
    );
  }

  getUpcomingBills(farmId: number): Observable<PageResponse<UpcomingBill>> {
    return this.http.get<PageResponse<UpcomingBill>>(`${this.apiUrl}/financial/upcoming-bills`, {
      params: new HttpParams()
        .set('farmId', farmId)
        .set('page', 0)
        .set('size', 5)
        .set('sort', 'dueDate')
        .set('direction', 'ASC'),
    });
  }
  private buildReportParams(filters: FinancialReportRequest): HttpParams {
    let params = new HttpParams()
      .set('farmId', filters.farmId)
      .set('startDate', filters.startDate)
      .set('endDate', filters.endDate)
      .set('basis', filters.basis)
      .set('granularity', filters.granularity ?? 'MONTHLY');
    if (filters.harvestSeasonIds.length)
      params = params.set('harvestSeasonIds', filters.harvestSeasonIds.join(','));
    if (filters.categoryIds.length)
      params = params.set('categoryIds', filters.categoryIds.join(','));
    return params;
  }
}
