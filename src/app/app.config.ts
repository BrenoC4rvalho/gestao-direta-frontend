import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideGestaoDiretaIcons } from './core/constants/lucide-icons';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { ThemeStore } from './core/stores/theme.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideGestaoDiretaIcons(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor, authInterceptor])),
    provideRouter(routes),
    provideAppInitializer(() => inject(ThemeStore).init()),
  ],
};
