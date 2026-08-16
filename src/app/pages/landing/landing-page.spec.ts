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

  it('should set the SEO page title', () => {
    expect(TestBed.inject(Title).getTitle()).toBe(
      'Gestão Direta — Gestão financeira para produtores rurais',
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

  it('should link Começar agora to WhatsApp', () => {
    const link = query<HTMLAnchorElement>('[data-testid="landing-start-link"]');

    expect(link?.getAttribute('href')).toBe('https://wa.me/5524988276875');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('should render the prioritized hero image at its intrinsic 3:2 ratio', () => {
    const image = query<HTMLImageElement>('img[alt="Visão da plataforma Gestão Direta"]');
    const imageContainer = image?.parentElement;

    expect(image?.getAttribute('src')).toContain('/assets/img/lading.png');
    expect(image?.getAttribute('width')).toBe('1536');
    expect(image?.getAttribute('height')).toBe('1024');
    expect(image?.getAttribute('fetchpriority')).toBe('high');
    expect(image?.classList.contains('h-full')).toBe(true);
    expect(image?.classList.contains('w-full')).toBe(true);
    expect(image?.classList.contains('object-cover')).toBe(true);
    expect(imageContainer?.classList.contains('aspect-[3/2]')).toBe(true);
    expect(imageContainer?.classList.contains('overflow-hidden')).toBe(true);
    expect(image?.parentElement?.parentElement?.classList.contains('xl:h-full')).toBe(true);
    expect(image?.parentElement?.parentElement?.classList.contains('xl:w-full')).toBe(true);
    expect(image?.parentElement?.parentElement?.classList.contains('xl:aspect-[3/2]')).toBe(true);
    expect(image?.classList.contains('h-64')).toBe(false);
    expect(image?.classList.contains('sm:h-80')).toBe(false);
    expect(image?.classList.contains('lg:h-[28rem]')).toBe(false);
    expect(textContent()).not.toContain('Saldo projetado');
    expect(textContent()).not.toContain('R$ 84.320');
    expect(textContent()).not.toContain('R$ 126.800');
    expect(textContent()).not.toContain('R$ 42.480');
  });

  it('should render the Problema section', () => {
    expect(textContent()).toContain('O problema no campo não é produzir. É gerenciar.');
    expect(textContent()).toContain(
      'Informações em cadernos, conversas e planilhas dificultam encontrar o que aconteceu.',
    );
  });

  it('should render the Solução section', () => {
    expect(textContent()).toContain('Uma solução simples para uma realidade complexa');
    expect(textContent()).toContain('Receitas e despesas organizadas');
  });

  it('should communicate message-based registration with Telegram available and WhatsApp coming soon', () => {
    const text = textContent();

    expect(text).toContain('Sua gestão financeira começa com uma mensagem');
    expect(text).toContain('Telegram');
    expect(text).toContain('Disponível');
    expect(text).toContain('WhatsApp');
    expect(text).toContain('Em breve');
    expect(text).toContain(
      'A movimentação foi enviada para revisão antes de entrar no seu controle financeiro.',
    );
    expect(text).toContain('A IA organiza');
    expect(text).not.toContain('Controle financeiro direto pelo WhatsApp');
    expect(text).not.toContain('Consulte saldo e relatórios por mensagem.');
    expect(text).not.toContain('Registrado!');
  });

  it('should render the Benefícios section', () => {
    expect(textContent()).toContain('Por que usar o Gestão Direta?');
    expect(textContent()).toContain('Mais clareza para decidir');
  });

  it('should render the Em breve section', () => {
    expect(textContent()).toContain('Evoluindo com você');
    expect(textContent()).toContain('IA para compra de insumos');
  });

  it('should expose responsive anchors for the landing sections', () => {
    expect(query<HTMLAnchorElement>('a[href="\#mensagens"]'))?.toBeTruthy();
    expect(query<HTMLElement>('#mensagens'))?.toBeTruthy();
    expect(query<HTMLElement>('#mensagens')?.classList.contains('scroll-mt-32')).toBe(true);
  });

  it('should render the final CTA section', () => {
    expect(textContent()).toContain('Pare de adivinhar. Comece a decidir com dados.');
    expect(textContent()).toContain('Entrar em contato');
    expect(
      query<HTMLAnchorElement>('a[href="https://wa.me/5524988276875"]')?.getAttribute('target'),
    ).toBe('_blank');
  });

  it('should not render the authenticated app layout chrome', () => {
    expect(query('gd-desktop-sidebar')).toBeNull();
    expect(query('gd-mobile-header')).toBeNull();
    expect(query('gd-farm-context-selector')).toBeNull();
  });
});
