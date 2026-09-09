import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { LandingPage } from './landing-page';

@Component({ template: '' })
class LoginStub {}

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideGestaoDiretaIcons(),
        provideRouter([{ path: 'login', component: LoginStub }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  function textContent(): string {
    return fixture.nativeElement.textContent as string;
  }

  function query<T extends Element>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('sets the landing SEO title', () => {
    expect(TestBed.inject(Title).getTitle()).toBe('Gestão Direta | Gestão financeira rural');
  });

  it('renders the financial management hero and realistic product preview', () => {
    const text = textContent();

    expect(text).toContain('Mais controle sobre as finanças da sua propriedade rural');
    expect(text).toContain(
      'Organize receitas, despesas e compromissos, acompanhe cada Safra e tenha informações mais claras para planejar e tomar decisões.',
    );
    expect(text).not.toContain('Gestão financeira rural mais simples, organizada e inteligente');
    expect(text).not.toContain('Gestão financeira para o campo');
    expect(text).not.toContain('Telegram integrado');
    expect(text).toContain('Resumo da propriedade');
    expect(text).toContain('Fluxo de caixa');
    expect(text).toContain('Café 2026/2027');
    expect(text).toContain('Movimentação identificada');
    expect(query('img[src*="lading.png"]')).toBeNull();
  });

  it('keeps the commercial and platform CTAs on real destinations', () => {
    const startLink = query<HTMLAnchorElement>('[data-testid="landing-start-link"]');
    const platformLink = query<HTMLAnchorElement>('[data-testid="landing-platform-link"]');

    expect(startLink?.getAttribute('href')).toBe('https://wa.me/5524988276875');
    expect(startLink?.getAttribute('target')).toBe('_blank');
    expect(platformLink?.getAttribute('href')).toBe('#funcionalidades');
  });

  it('navigates to login from the navbar', async () => {
    query<HTMLAnchorElement>('[data-testid="landing-login-link"]')?.click();
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('renders the principal anchored sections', () => {
    for (const id of [
      'como-funciona',
      'funcionalidades',
      'telegram',
      'inteligencia-artificial',
      'safras',
      'compromissos',
      'relatorios',
    ]) {
      expect(query(`#${id}`), `missing #${id}`).toBeTruthy();
    }
  });

  it('communicates Telegram text and audio parsing with mandatory review', () => {
    const text = textContent();

    expect(text).toContain('Telegram disponível');
    expect(text).toContain('Registre movimentações por texto ou áudio');
    expect(text).toContain('Envie uma mensagem de texto ou um áudio pelo Telegram');
    expect(text).toContain('O Gestão Direta interpreta as informações');
    expect(text).toContain('Áudio · 0:08');
    expect(text).toContain('Gastei quatrocentos reais com diesel para o trator');
    expect(text).toContain('R$ 400,00');
    expect(text).toContain('Combustíveis');
    expect(text).toContain('Aguardando revisão');
    expect(text).toContain('Aprove somente depois de revisar os dados');
    expect(text).toContain('WhatsApp');
    expect(text).toContain('Em breve');
  });

  it('renders Harvest planning and the real two-Harvest comparison model', () => {
    const text = textContent();

    expect(text).toContain('Entenda o resultado de cada Safra');
    expect(text).toContain('Planeje antes de executar');
    expect(text).toContain('Planejado × realizado');
    expect(text).toContain('Café 2025/2026');
    expect(text).toContain('Café 2026/2027');
    expect(text).toContain('Resultado / ha');
  });

  it('renders Agenda Financeira, reports and the final CTA', () => {
    const text = textContent();

    expect(text).toContain('Saiba o que ainda precisa entrar e sair do caixa');
    expect(text).toContain('Transforme registros em informações para decidir melhor');
    expect(text).toContain('Tenha mais controle sobre o financeiro da sua propriedade');
    expect(query('[data-testid="landing-final-start-link"]')).toBeTruthy();
  });

  it('opens and closes the accessible mobile menu', () => {
    const menuButton = query<HTMLButtonElement>('button[aria-controls="landing-mobile-menu"]');

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    menuButton?.click();
    fixture.detectChanges();
    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(query('#landing-mobile-menu')).toBeTruthy();

    menuButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(query('#landing-mobile-menu')).toBeNull();
  });

  it('does not render authenticated layout chrome or unsupported promises', () => {
    expect(query('gd-desktop-sidebar')).toBeNull();
    expect(query('gd-mobile-header')).toBeNull();
    expect(textContent()).not.toContain('IA para compra de insumos');
    expect(textContent()).not.toContain('benchmarking');
  });
});
