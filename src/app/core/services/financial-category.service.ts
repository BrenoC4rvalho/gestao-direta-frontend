import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateFinancialCategoryRequest,
  FinancialCategory,
  UpdateFinancialCategoryRequest,
} from '../models/financial-category.models';
import { PageRequest, PageResponse } from '../models/page-response.model';

export interface FinancialCategoryListByFarmParams extends PageRequest {
  includeInactive?: boolean;
  search?: string | null;
  type?: string | null;
  status?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FinancialCategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listByFarm(
    farmId: number,
    params: FinancialCategoryListByFarmParams = {},
  ): Observable<FinancialCategory[]> {
    return this.http
      .get<PageResponse<FinancialCategory>>(`${this.apiUrl}/financial/categories`, {
        params: this.buildListParams(farmId, params),
      })
      .pipe(map((response) => response.content));
  }

  listUsedInTransactions(farmId: number): Observable<FinancialCategory[]> {
    return this.http.get<FinancialCategory[]>(
      `${this.apiUrl}/financial/categories/used-in-transactions`,
      {
        params: new HttpParams().set('farmId', farmId),
      },
    );
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

  private buildListParams(
    farmId: number,
    params: FinancialCategoryListByFarmParams,
  ): HttpParams {
    let httpParams = new HttpParams().set('farmId', farmId);

    if (params.includeInactive !== undefined) {
      httpParams = httpParams.set('includeInactive', params.includeInactive);
    }

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    if (params.type) {
      httpParams = httpParams.set('type', params.type);
    }

    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }

    if (params.sort !== undefined) {
      httpParams = httpParams.set('sort', params.sort);
    }

    if (params.direction !== undefined) {
      httpParams = httpParams.set('direction', params.direction);
    }

    return httpParams;
  }
}
