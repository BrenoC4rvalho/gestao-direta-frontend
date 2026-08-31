import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFinancialTransactionRequest,
  FinancialTransaction,
  FinancialTransactionExportParams,
  FinancialTransactionListParams,
  FinancialTransactionPage,
  MarkFinancialTransactionAsPaidRequest,
  UpdateFinancialTransactionRequest,
} from '../models/financial-transaction.models';
import { appendQueryParam } from '../../shared/utils/query-params.utils';

@Injectable({
  providedIn: 'root',
})
export class FinancialTransactionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(params: FinancialTransactionListParams): Observable<FinancialTransactionPage> {
    return this.http.get<FinancialTransactionPage>(`${this.apiUrl}/financial/transactions`, {
      params: this.buildListParams(params),
    });
  }

  exportXlsx(params: FinancialTransactionExportParams): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/financial/transactions/export/xlsx`, {
      params: this.buildExportParams(params),
      observe: 'response',
      responseType: 'blob',
    });
  }

  exportPdf(params: FinancialTransactionExportParams): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/financial/transactions/export/pdf`, {
      params: this.buildExportParams(params),
      observe: 'response',
      responseType: 'blob',
    });
  }

  getById(id: number): Observable<FinancialTransaction> {
    return this.http.get<FinancialTransaction>(`${this.apiUrl}/financial/transactions/${id}`);
  }

  create(payload: CreateFinancialTransactionRequest): Observable<FinancialTransaction> {
    return this.http.post<FinancialTransaction>(
      `${this.apiUrl}/financial/transactions`,
      payload,
    );
  }

  update(
    id: number,
    payload: UpdateFinancialTransactionRequest,
  ): Observable<FinancialTransaction> {
    return this.http.put<FinancialTransaction>(
      `${this.apiUrl}/financial/transactions/${id}`,
      payload,
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/financial/transactions/${id}`);
  }

  markAsPaid(
    id: number,
    payload: MarkFinancialTransactionAsPaidRequest = {},
  ): Observable<FinancialTransaction> {
    return this.http.patch<FinancialTransaction>(
      `${this.apiUrl}/financial/transactions/${id}/pay`,
      payload,
    );
  }

  cancel(id: number): Observable<FinancialTransaction> {
    return this.http.patch<FinancialTransaction>(
      `${this.apiUrl}/financial/transactions/${id}/cancel`,
      {},
    );
  }

  private buildListParams(params: FinancialTransactionListParams): HttpParams {
    let httpParams = new HttpParams()
      .set('farmId', params.farmId)
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10)
      .set('sort', params.sort ?? 'transactionDate')
      .set('direction', params.direction ?? 'DESC');

    return this.appendFilterParams(httpParams, params);
  }

  private buildExportParams(params: FinancialTransactionExportParams): HttpParams {
    return this.appendFilterParams(new HttpParams().set('farmId', params.farmId), params);
  }

  private appendFilterParams(
    httpParams: HttpParams,
    params: FinancialTransactionExportParams,
  ): HttpParams {
    const optionalParams = {
      transactionDateStart: params.transactionDateStart,
      transactionDateEnd: params.transactionDateEnd,
      paidAtStart: params.paidAtStart,
      paidAtEnd: params.paidAtEnd,
      type: params.type,
      recordStatus: params.recordStatus,
      description: params.description,
      createdByUserId: params.createdByUserId,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      harvestSeasonId: params.harvestSeasonId,
    };

    for (const [key, value] of Object.entries(optionalParams)) {
      httpParams = appendQueryParam(httpParams, key, value);
    }

    if (params.categoryIds?.length) {
      httpParams = appendQueryParam(httpParams, 'categoryIds', params.categoryIds);
    } else {
      httpParams = appendQueryParam(httpParams, 'categoryId', params.categoryId);
    }

    if (params.paymentStatuses?.length) {
      httpParams = appendQueryParam(httpParams, 'paymentStatuses', params.paymentStatuses);
    } else {
      httpParams = appendQueryParam(httpParams, 'paymentStatus', params.paymentStatus);
    }

    if (params.paymentMethods?.length) {
      httpParams = appendQueryParam(httpParams, 'paymentMethods', params.paymentMethods);
    } else {
      httpParams = appendQueryParam(httpParams, 'paymentMethod', params.paymentMethod);
    }

    return httpParams;
  }
}
