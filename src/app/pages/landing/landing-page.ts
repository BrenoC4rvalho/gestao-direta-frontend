import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

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
  readonly sender: 'Usuário' | 'Gestão Direta';
  readonly text: string;
  readonly own?: boolean;
}

@Component({
  selector: 'gd-landing-page',
  imports: [LucideDynamicIcon, NgOptimizedImage, RouterLink],
  templateUrl: './landing-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  private readonly title = inject(Title);

  protected readonly problemCards: readonly LandingCard[] = [
    {
      icon: 'alert-triangle',
      title: 'Contas misturadas',
      description: 'Mistura de contas pessoais e da fazenda dificulta controle.',
    },
    {
      icon: 'trending-down',
      title: 'Lucro pouco claro',
      description: 'Falta de visão do lucro real por cultura, safra ou atividade.',
    },
    {
      icon: 'credit-card',
      title: 'Crédito mais difícil',
      description: 'Dificuldade de acesso a crédito por falta de documentação organizada.',
    },
    {
      icon: 'calendar-days',
      title: 'Pouca previsibilidade',
      description: 'Falta de previsibilidade financeira entre safras.',
    },
  ];

  protected readonly solutionItems: readonly SolutionItem[] = [
    {
      title: 'Controle de fluxo de caixa',
      description: 'Registre entradas e saídas de forma simples e organizada.',
    },
    {
      title: 'Organização por safra/lote',
      description: 'Separe custos e receitas por cultura para saber o que realmente dá lucro.',
    },
    {
      title: 'Projeções automáticas',
      description: 'Veja seu saldo futuro e planeje investimentos com confiança.',
    },
  ];

  protected readonly chatMessages: readonly ChatMessage[] = [
    {
      sender: 'Usuário',
      text: 'Gastei 200 reais de diesel hoje na safra soja',
      own: true,
    },
    {
      sender: 'Gestão Direta',
      text: 'Registrado! R$ 200,00 em Diesel para Safra Soja 2025/26.',
    },
    {
      sender: 'Usuário',
      text: 'Quanto gastei esse mês?',
      own: true,
    },
    {
      sender: 'Gestão Direta',
      text: 'Gastos de Abril/2026: R$ 8.450,00\nInsumos: R$ 4.200,00\nCombustível: R$ 1.850,00\nManutenção: R$ 2.400,00',
    },
  ];

  protected readonly benefits: readonly LandingCard[] = [
    {
      icon: 'chart-spline',
      title: 'Melhor tomada de decisão',
      description: 'Tome decisões baseadas em dados reais, não em estimativas.',
    },
    {
      icon: 'shield-check',
      title: 'Redução de riscos financeiros',
      description: 'Identifique problemas antes que eles se tornem críticos.',
    },
    {
      icon: 'landmark',
      title: 'Acesso facilitado a crédito',
      description: 'Apresente sua situação financeira de forma clara aos bancos.',
    },
    {
      icon: 'circle-dollar-sign',
      title: 'Visão clara da lucratividade',
      description: 'Saiba exatamente quais culturas e atividades dão mais retorno.',
    },
    {
      icon: 'list-checks',
      title: 'Menos dependência de "achismo"',
      description: 'Substitua intuição por informação precisa.',
    },
    {
      icon: 'sprout',
      title: 'Crescimento sustentável',
      description: 'Planeje expansões e investimentos com segurança.',
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
    this.title.setTitle('Gestão Direta — Finanças simplificadas para a Agricultura');
  }
}
