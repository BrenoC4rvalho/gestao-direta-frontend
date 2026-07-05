import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

import { provideGestaoDiretaIcons } from '../../core/constants/lucide-icons';

import { LandingPage } from './landing-page';

@Component({
  template: '',
})
class LoginStub {}

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideGestaoDiretaIcons(), provideRouter([{ path: 'login', component: LoginStub }])],
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

  it('should set the SEO page title', () => {
    expect(TestBed.inject(Title).getTitle()).toBe(
      'Gestão Direta — Finanças simplificadas para a Agricultura',
    );
  });

  it('should render the main title', () => {
    expect(textContent()).toContain('Controle financeiro simples para quem produz o Brasil');
  });

  it('should render Entrar and Começar agora buttons', () => {
    expect(textContent()).toContain('Entrar');
    expect(textContent()).toContain('Começar agora');
  });

  it('should navigate to login when Entrar is clicked', async () => {
    query<HTMLAnchorElement>('[data-testid="landing-login-link"]')?.click();
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('should navigate to login when Começar agora is clicked', async () => {
    query<HTMLAnchorElement>('[data-testid="landing-start-link"]')?.click();
    await fixture.whenStable();

    expect(router.url).toBe('/login');
  });

  it('should render the Problema section', () => {
    expect(textContent()).toContain('O problema no campo não é produzir. É gerenciar.');
    expect(textContent()).toContain('Mistura de contas pessoais e da fazenda dificulta controle.');
  });

  it('should render the Solução section', () => {
    expect(textContent()).toContain('Uma solução simples para uma realidade complexa');
    expect(textContent()).toContain('Controle de fluxo de caixa');
  });

  it('should render the WhatsApp section', () => {
    expect(textContent()).toContain('Controle financeiro direto pelo WhatsApp');
    expect(textContent()).toContain('Gastei 200 reais de diesel hoje na safra soja');
  });

  it('should render the Benefícios section', () => {
    expect(textContent()).toContain('Por que usar o Gestão Direta?');
    expect(textContent()).toContain('Melhor tomada de decisão');
  });

  it('should render the Em breve section', () => {
    expect(textContent()).toContain('Evoluindo com você');
    expect(textContent()).toContain('IA para compra de insumos');
  });

  it('should render the final CTA section', () => {
    expect(textContent()).toContain('Pare de adivinhar. Comece a decidir com dados.');
    expect(textContent()).toContain('Quero usar o Gestão Direta');
  });

  it('should not render the authenticated app layout chrome', () => {
    expect(query('gd-desktop-sidebar')).toBeNull();
    expect(query('gd-mobile-header')).toBeNull();
    expect(query('gd-farm-context-selector')).toBeNull();
  });
});
