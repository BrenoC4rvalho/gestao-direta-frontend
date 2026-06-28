import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFinancialCategoryRequest,
  FinancialCategory,
  UpdateFinancialCategoryRequest,
} from '../models/financial-category.models';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class FinancialCategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(farmId: number): Observable<FinancialCategory[]> {
    return this.http
      .get<PageResponse<FinancialCategory>>(`${this.apiUrl}/financial/categories`, {
        params: new HttpParams().set('farmId', farmId),
      })
      .pipe(map((response) => response.content));
  }

  listGlobal(): Observable<FinancialCategory[]> {
    return this.http
      .get<PageResponse<FinancialCategory>>(`${this.apiUrl}/financial/categories/global`)
      .pipe(map((response) => response.content));
  }

  getById(id: number): Observable<FinancialCategory> {
    return this.http.get<FinancialCategory>(`${this.apiUrl}/financial/categories/${id}`);
  }

  create(payload: CreateFinancialCategoryRequest): Observable<FinancialCategory> {
    return this.http.post<FinancialCategory>(
      `${this.apiUrl}/financial/categories`,
      payload,
    );
  }

  update(
    id: number,
    payload: UpdateFinancialCategoryRequest,
  ): Observable<FinancialCategory> {
    return this.http.put<FinancialCategory>(
      `${this.apiUrl}/financial/categories/${id}`,
      payload,
    );
  }

  activate(id: number): Observable<FinancialCategory> {
    return this.http.patch<FinancialCategory>(
      `${this.apiUrl}/financial/categories/${id}/activate`,
      {},
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/financial/categories/${id}`);
  }
}
