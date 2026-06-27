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
      params: new HttpParams()
        .set('farmId', params.farmId)
        .set('page', params.page ?? 0)
        .set('size', params.size ?? 10)
        .set('sort', params.sort ?? 'transactionDate')
        .set('direction', params.direction ?? 'DESC'),
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
}
