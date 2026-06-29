import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFinancialTransactionRequest,
  FinancialTransaction,
  FinancialTransactionListParams,
  FinancialTransactionPage,
  MarkFinancialTransactionAsPaidRequest,
  UpdateFinancialTransactionRequest,
} from '../models/financial-transaction.models';

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

    const optionalParams = {
      transactionDateStart: params.transactionDateStart,
      transactionDateEnd: params.transactionDateEnd,
      paidAtStart: params.paidAtStart,
      paidAtEnd: params.paidAtEnd,
      type: params.type,
      categoryId: params.categoryId,
      paymentStatus: params.paymentStatus,
      paymentMethod: params.paymentMethod,
      recordStatus: params.recordStatus,
      description: params.description,
      createdByUserId: params.createdByUserId,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
    };

    for (const [key, value] of Object.entries(optionalParams)) {
      if (this.hasParamValue(value)) {
        httpParams = httpParams.set(key, value);
      }
    }

    return httpParams;
  }

  private hasParamValue(value: unknown): value is string | number | boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return true;
  }
}
