import { HttpParams } from '@angular/common/http';

type QueryParamValue = string | number | boolean | null | undefined;

export function appendQueryParam(
  params: HttpParams,
  key: string,
  value: QueryParamValue | readonly QueryParamValue[],
): HttpParams {
  if (Array.isArray(value)) {
    return value.reduce(
      (currentParams, item) => appendSingleParam(currentParams, key, item, true),
      params,
    );
  }

  return appendSingleParam(params, key, value as QueryParamValue, false);
}

function appendSingleParam(
  params: HttpParams,
  key: string,
  value: QueryParamValue,
  repeated: boolean,
): HttpParams {
  const normalized = normalizeQueryParamValue(value);

  if (normalized === null) {
    return params;
  }

  return repeated ? params.append(key, normalized) : params.set(key, normalized);
}

function normalizeQueryParamValue(value: QueryParamValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return String(value);
}
