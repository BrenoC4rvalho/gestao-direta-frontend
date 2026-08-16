import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { Badge } from '../../shared/ui';

interface LandingCard {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

interface SolutionItem {
  readonly title: string;
  readonly description: string;
}

interface ChatMessage {
  readonly sender: 'Você' | 'Gestão Direta';
  readonly text: string;
  readonly own?: boolean;
}

interface MessageStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'gd-landing-page',
  imports: [Badge, LucideDynamicIcon, NgOptimizedImage, RouterLink],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  private readonly title = inject(Title);

  protected readonly problemCards: readonly LandingCard[] = [
    {
      icon: 'inbox',
      title: 'Anotações espalhadas',
      description:
        'Informações em cadernos, conversas e planilhas dificultam encontrar o que aconteceu.',
    },
    {
      icon: 'receipt-text',
      title: 'Receitas e despesas sem organização',
      description:
        'Registrar cada movimentação depois consome tempo e aumenta a chance de esquecer detalhes.',
    },
    {
      icon: 'sprout',
      title: 'Visão por safra difícil',
      description:
        'Sem separar os lançamentos, acompanhar os resultados de cada ciclo fica mais trabalhoso.',
    },
    {
      icon: 'calendar-days',
      title: 'Informações descentralizadas',
      description:
        'Decisões importantes ficam mais difíceis quando os dados financeiros não estão no mesmo lugar.',
    },
  ];

  protected readonly solutionItems: readonly SolutionItem[] = [
    {
      title: 'Receitas e despesas organizadas',
      description: 'Registre movimentações e acompanhe o financeiro da fazenda em um só lugar.',
    },
    {
      title: 'Fazendas, safras e categorias',
      description:
        'Relacione os lançamentos ao contexto da produção para manter a gestão organizada.',
    },
    {
      title: 'Indicadores e relatórios financeiros',
      description: 'Acompanhe receitas, despesas, saldo e resultados com os dados já cadastrados.',
    },
    {
      title: 'Movimentações por mensagem com revisão',
      description:
        'Envie uma descrição, revise os dados identificados e confirme antes de incluir no financeiro.',
    },
  ];

  protected readonly chatMessages: readonly ChatMessage[] = [
    {
      sender: 'Você',
      text: 'Gastei R$ 200 de diesel hoje na safra de soja.',
      own: true,
    },
    {
      sender: 'Gestão Direta',
      text: 'Identifiquei uma despesa:\n\nR$ 200,00\nCombustível\nSafra de soja\n\nA movimentação foi enviada para revisão antes de entrar no seu controle financeiro.',
    },
  ];

  protected readonly messageSteps: readonly MessageStep[] = [
    {
      number: '1',
      title: 'Envie',
      description: 'Descreva a movimentação como você falaria normalmente.',
    },
    {
      number: '2',
      title: 'A IA organiza',
      description: 'Valor, tipo, data e outras informações são identificados quando disponíveis.',
    },
    {
      number: '3',
      title: 'Revise',
      description: 'Confira os dados e complete o que estiver faltando.',
    },
    {
      number: '4',
      title: 'Confirme',
      description: 'A movimentação entra no seu controle financeiro.',
    },
  ];

  protected readonly benefits: readonly LandingCard[] = [
    {
      icon: 'chart-spline',
      title: 'Mais clareza para decidir',
      description: 'Consulte receitas, despesas e saldo com as informações organizadas.',
    },
    {
      icon: 'list-checks',
      title: 'Rotina financeira mais simples',
      description: 'Mantenha os lançamentos, categorias e pendências no mesmo sistema.',
    },
    {
      icon: 'sprout',
      title: 'Acompanhamento por fazenda e safra',
      description: 'Organize os dados conforme a realidade da sua produção.',
    },
    {
      icon: 'receipt-text',
      title: 'Revisão antes da aprovação',
      description: 'Ajuste as movimentações identificadas por mensagem antes de confirmar.',
    },
  ];

  protected readonly roadmapItems: readonly LandingCard[] = [
    {
      icon: 'sparkles',
      title: 'IA para compra de insumos',
      description: 'Recomendações inteligentes de melhor momento e preço para comprar.',
    },
    {
      icon: 'trending-up',
      title: 'IA para venda da safra',
      description: 'Análise de mercado para maximizar sua receita.',
    },
    {
      icon: 'chart-no-axes-combined',
      title: 'Simulação de cenários',
      description: 'Teste diferentes estratégias antes de executar.',
    },
    {
      icon: 'receipt-text',
      title: 'Integração com NF-e',
      description: 'Importação automática de notas fiscais.',
    },
    {
      icon: 'inbox',
      title: 'Controle de estoque',
      description: 'Gerencie insumos, sementes e produção.',
    },
    {
      icon: 'badge-dollar-sign',
      title: 'Análises avançadas',
      description: 'Benchmarking e comparações com o mercado.',
    },
  ];

  constructor() {
    this.title.setTitle('Gestão Direta — Gestão financeira para produtores rurais');
  }
}
