import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-route-placeholder',
  template: `
    <main class="min-h-dvh bg-background px-4 py-6 text-text-primary">
      <section class="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl items-center">
        <div class="w-full rounded-app border border-border bg-surface p-6 shadow-soft">
          <p class="text-sm font-medium text-primary">Gestão Direta</p>
          <h1 class="mt-3 text-2xl font-semibold">{{ title() }}</h1>
          <p class="mt-2 max-w-xl text-sm leading-6 text-text-muted">
            Placeholder temporário para manter a estrutura de rotas do Passo 1 compilando.
          </p>
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePlaceholder {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = signal(this.route.snapshot.title ?? 'Página temporária');
}
