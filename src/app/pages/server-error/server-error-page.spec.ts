import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';
import { SystemStatus } from '../../core/models/system-status.models';
import { SystemStatusService } from '../../core/services/system-status.service';

import { ServerErrorPage } from './server-error-page';

describe('ServerErrorPage', () => {
  let fixture: ComponentFixture<ServerErrorPage>;
  let router: Router;
  let systemStatusService: {
    getStatus: ReturnType<typeof vi.fn>;
    isHealthy: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    systemStatusService = {
      getStatus: vi.fn().mockReturnValue(of({ status: 'DOWN', database: 'UP' })),
      isHealthy: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [ServerErrorPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([]),
        { provide: SystemStatusService, useValue: systemStatusService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServerErrorPage);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  function textContent(): string {
    return fixture.nativeElement.textContent as string;
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  }

  function retryButton(): HTMLButtonElement {
    return buttons().find((button) => button.textContent?.includes('Tentar novamente'))!;
  }

  function homeButton(): HTMLButtonElement {
    return buttons().find((button) => button.textContent?.includes('Voltar para início'))!;
  }

  it('should render the public server error content', () => {
    expect(textContent()).toContain('Não foi possível conectar ao servidor');
    expect(textContent()).toContain('A API ou o banco de dados podem estar instáveis no momento.');
    expect(textContent()).toContain('Tentar novamente');
    expect(textContent()).toContain('Voltar para início');
  });

  it('should navigate home from the secondary action', () => {
    homeButton().click();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show loading while retry is pending', () => {
    const status$ = new Subject<SystemStatus>();
    systemStatusService.getStatus.mockReturnValueOnce(status$);

    retryButton().click();
    fixture.detectChanges();

    expect(systemStatusService.getStatus).toHaveBeenCalledTimes(1);
    expect(retryButton().disabled).toBe(true);

    status$.next({ status: 'DOWN', database: 'UP' });
    status$.complete();
  });

  it('should navigate to dashboard when retry succeeds and status is healthy', () => {
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'UP', database: 'UP' }));
    systemStatusService.isHealthy.mockReturnValueOnce(true);

    retryButton().click();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show a connection message when retry request fails', () => {
    systemStatusService.getStatus.mockReturnValueOnce(throwError(() => new Error('network')));

    retryButton().click();
    fixture.detectChanges();

    expect(textContent()).toContain('A API não respondeu. Verifique sua conexão e tente novamente.');
    expect(router.navigate).not.toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show a server instability message when API status is unhealthy', () => {
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'DEGRADED', database: 'UP' }));
    systemStatusService.isHealthy.mockReturnValueOnce(false);

    retryButton().click();
    fixture.detectChanges();

    expect(textContent()).toContain('O servidor está instável no momento. Tente novamente em instantes.');
  });

  it('should show a database message when the database is down', () => {
    systemStatusService.getStatus.mockReturnValueOnce(of({ status: 'UP', database: 'DOWN' }));
    systemStatusService.isHealthy.mockReturnValueOnce(false);

    retryButton().click();
    fixture.detectChanges();

    expect(textContent()).toContain('O banco de dados está indisponível no momento. Tente novamente em instantes.');
  });
});
