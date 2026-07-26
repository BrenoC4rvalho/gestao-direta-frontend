import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApprovePendingFinancialTransactionRequest,
  PendingFinancialTransaction,
  PendingFinancialTransactionListParams,
  PendingFinancialTransactionPage,
  UpdatePendingFinancialTransactionRequest,
} from '../models/pending-financial-transaction.models';

@Injectable({ providedIn: 'root' })
export class PendingFinancialTransactionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/pending-financial-transactions`;

  list(params: PendingFinancialTransactionListParams): Observable<PendingFinancialTransactionPage> {
    let query = new HttpParams()
      .set('farmId', params.farmId)
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 10)
      .set('sort', params.sort ?? 'createdAt')
      .set('direction', params.direction ?? 'DESC');
    if (params.status) query = query.set('status', params.status);
    if (params.type) query = query.set('type', params.type);
    return this.http.get<PendingFinancialTransactionPage>(this.url, { params: query });
  }

  getById(id: number): Observable<PendingFinancialTransaction> {
    return this.http.get<PendingFinancialTransaction>(`${this.url}/${id}`);
  }

  update(id: number, request: UpdatePendingFinancialTransactionRequest): Observable<PendingFinancialTransaction> {
    return this.http.put<PendingFinancialTransaction>(`${this.url}/${id}`, request);
  }

  approve(id: number, request: ApprovePendingFinancialTransactionRequest): Observable<PendingFinancialTransaction> {
    return this.http.post<PendingFinancialTransaction>(`${this.url}/${id}/approve`, request);
  }

  reject(id: number, reason?: string): Observable<PendingFinancialTransaction> {
    return this.http.post<PendingFinancialTransaction>(`${this.url}/${id}/reject`, { reason });
  }
}
