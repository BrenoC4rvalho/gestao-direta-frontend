import { HttpParams } from '@angular/common/http';

import { appendQueryParam } from './query-params.utils';

describe('appendQueryParam', () => {
  it('should set a simple value', () => {
    const params = appendQueryParam(new HttpParams(), 'status', 'ACTIVE');

    expect(params.get('status')).toBe('ACTIVE');
  });

  it('should append array values as repeated params', () => {
    const params = appendQueryParam(new HttpParams(), 'statuses', ['ACTIVE', 'BLOCKED']);

    expect(params.getAll('statuses')).toEqual(['ACTIVE', 'BLOCKED']);
    expect(params.toString()).toBe('statuses=ACTIVE&statuses=BLOCKED');
  });

  it('should ignore empty arrays', () => {
    const params = appendQueryParam(new HttpParams(), 'statuses', []);

    expect(params.has('statuses')).toBe(false);
  });

  it('should ignore null, undefined and empty strings', () => {
    let params = new HttpParams();

    params = appendQueryParam(params, 'nullValue', null);
    params = appendQueryParam(params, 'undefinedValue', undefined);
    params = appendQueryParam(params, 'emptyValue', '   ');

    expect(params.keys()).toEqual([]);
  });

  it('should convert numbers and booleans to strings', () => {
    let params = new HttpParams();

    params = appendQueryParam(params, 'page', 2);
    params = appendQueryParam(params, 'enabled', false);

    expect(params.get('page')).toBe('2');
    expect(params.get('enabled')).toBe('false');
  });
});
