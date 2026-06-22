import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-route-placeholder',
  template: `
    <section class='rounded-app border border-border bg-surface p-6 shadow-soft'>
      <p class='text-sm font-medium text-primary'>Gestão Direta</p>
      <h1 class='mt-3 text-2xl font-semibold text-text-primary'>{{ title() }}</h1>
      <p class='mt-2 max-w-xl text-sm leading-6 text-text-muted'>
        Placeholder temporário para manter a estrutura de rotas compilando enquanto as páginas finais
        ainda não foram implementadas.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePlaceholder {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = signal(this.route.snapshot.title ?? 'Página temporária');
}
