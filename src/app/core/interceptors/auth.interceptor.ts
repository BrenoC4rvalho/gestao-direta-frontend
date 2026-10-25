import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthSessionService } from '../services/auth-session.service';

const normalizePath = (url: string): string =>
  url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/^\/api(?=\/)/, '');

const isPublicAuthRequest = (url: string): boolean => {
  const path = normalizePath(url);

  return (
    path === '/auth/login' ||
    path === '/auth/session' ||
    path === '/auth/logout' ||
    path.startsWith('/auth/password-recovery/')
  );
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authSession = inject(AuthSessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuthRequest(req.url)
      ) {
        authSession.expire();
      }

      return throwError(() => error);
    }),
  );
};
