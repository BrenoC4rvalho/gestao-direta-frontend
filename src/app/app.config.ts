import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { provideGestaoDiretaIcons } from './core/constants/lucide-icons';
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { ThemeStore } from './core/stores/theme.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
    provideGestaoDiretaIcons(),
    provideAppInitializer(() => inject(ThemeStore).init()),
  ],
};
