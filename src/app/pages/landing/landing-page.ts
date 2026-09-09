import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { DashboardPreview } from './components/dashboard-preview/dashboard-preview';
import { FinancialShowcase } from './components/financial-showcase/financial-showcase';
import { HarvestShowcase } from './components/harvest-showcase/harvest-showcase';
import { LandingNavbar } from './components/landing-navbar/landing-navbar';
import { TelegramAiShowcase } from './components/telegram-ai-showcase/telegram-ai-showcase';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

interface LandingItem {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

interface LandingStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'gd-landing-page',
  imports: [
    DashboardPreview,
    FinancialShowcase,
    HarvestShowcase,
    LandingNavbar,
    LucideDynamicIcon,
    NgOptimizedImage,
    RevealOnScrollDirective,
    RouterLink,
    TelegramAiShowcase,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  private readonly title = inject(Title);

  protected readonly proofPoints: readonly Pick<LandingItem, 'icon' | 'title'>[] = [
    { icon: 'message-circle', title: 'Registre em segundos' },
    { icon: 'sprout', title: 'Organize por Safra' },
    { icon: 'list-checks', title: 'Planeje antes de gastar' },
    { icon: 'wallet', title: 'Acompanhe seu caixa' },
    { icon: 'chart-spline', title: 'Decida com informação' },
  ];

  protected readonly problems: readonly LandingItem[] = [
    { icon: 'inbox', title: 'Controle manual', description: 'Receitas e despesas ficam espalhadas entre planilhas, cadernos e anotações.' },
    { icon: 'wallet', title: 'Falta de visão do caixa', description: 'Sem acompanhar compromissos futuros, fica difícil saber quanto realmente estará disponível.' },
    { icon: 'sprout', title: 'Custos da Safra', description: 'Sem planejamento, é difícil identificar onde os gastos ultrapassaram o esperado.' },
    { icon: 'clock', title: 'Informação atrasada', description: 'Quando os registros ficam para depois, decisões são tomadas sem dados atualizados.' },
    { icon: 'chart-no-axes-combined', title: 'Dificuldade para comparar', description: 'Sem histórico organizado, comparar resultados entre Safras se torna trabalhoso.' },
  ];

  protected readonly features: readonly LandingItem[] = [
    { icon: 'receipt-text', title: 'Movimentações financeiras', description: 'Registre receitas e despesas, organize por categoria e acompanhe o histórico da propriedade.' },
    { icon: 'calendar-clock', title: 'Agenda Financeira', description: 'Visualize valores a pagar e a receber e acompanhe os próximos compromissos.' },
    { icon: 'sprout', title: 'Gestão de Safras', description: 'Acompanhe cada ciclo produtivo com período, atividade, área e informações financeiras.' },
    { icon: 'list-checks', title: 'Planejamento financeiro', description: 'Planeje despesas e receitas por categoria antes e durante a Safra.' },
    { icon: 'chart-spline', title: 'Relatórios e indicadores', description: 'Transforme os registros financeiros em informações mais claras para análise.' },
    { icon: 'message-circle', title: 'Telegram + IA', description: 'Envie movimentações por mensagem e revise os dados estruturados antes da aprovação.' },
  ];

  protected readonly steps: readonly LandingStep[] = [
    { number: '01', title: 'Registre', description: 'Cadastre uma movimentação no sistema ou envie uma mensagem pelo Telegram.' },
    { number: '02', title: 'Organize', description: 'Relacione as informações à Fazenda, categoria e Safra.' },
    { number: '03', title: 'Acompanhe', description: 'Visualize receitas, despesas, compromissos, planejamento e resultados.' },
    { number: '04', title: 'Analise', description: 'Use relatórios e indicadores para entender melhor a situação financeira.' },
  ];

  protected readonly benefits: readonly LandingItem[] = [
    { icon: 'receipt-text', title: 'Registre com facilidade', description: 'Reduza o esforço necessário para manter as informações financeiras atualizadas.' },
    { icon: 'list-checks', title: 'Planeje melhor', description: 'Organize custos e receitas esperadas antes de executar a Safra.' },
    { icon: 'calendar-clock', title: 'Acompanhe o caixa', description: 'Visualize compromissos e entenda o que ainda precisa pagar ou receber.' },
    { icon: 'chart-spline', title: 'Decida com informação', description: 'Use histórico, relatórios e indicadores para apoiar suas decisões.' },
  ];

  constructor() {
    this.title.setTitle('Gestão Direta | Gestão financeira rural');
  }
}
