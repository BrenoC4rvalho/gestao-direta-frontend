import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  LUCIDE_ICONS,
  LucideAlertTriangle,
  LucideCheck,
  LucideInfo,
  LucideX,
  provideLucideIcons,
} from '@lucide/angular';

import { provideLocalLucideIcons } from './lucide-icons';

@Component({
  selector: 'gd-lucide-icons-probe',
  template: '',
})
class LucideIconsProbe {
  readonly icons = inject(LUCIDE_ICONS);
}

@Component({
  imports: [LucideIconsProbe],
  providers: [provideLocalLucideIcons(LucideAlertTriangle)],
  template: '<gd-lucide-icons-probe />',
})
class AlertTriangleArea {}

@Component({
  imports: [LucideIconsProbe],
  providers: [provideLocalLucideIcons(LucideInfo)],
  template: '<gd-lucide-icons-probe />',
})
class InfoArea {}

describe('provideLocalLucideIcons', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideLucideIcons(LucideCheck, LucideX)],
    });
  });

  it('merges the global and local icon maps for a child injector', () => {
    const fixture = TestBed.createComponent(AlertTriangleArea);
    fixture.detectChanges();

    const icons = fixture.debugElement.children[0].injector.get(LUCIDE_ICONS);

    expect(icons['check']).toBeDefined();
    expect(icons['x']).toBeDefined();
    expect(icons['alert-triangle']).toBeDefined();
  });

  it('keeps the root map unchanged', () => {
    const fixture = TestBed.createComponent(AlertTriangleArea);
    fixture.detectChanges();

    const rootIcons = TestBed.inject(LUCIDE_ICONS);

    expect(rootIcons['check']).toBeDefined();
    expect(rootIcons['alert-triangle']).toBeUndefined();
  });

  it('keeps lazy areas isolated while inheriting the same global icons', () => {
    const alertFixture = TestBed.createComponent(AlertTriangleArea);
    const infoFixture = TestBed.createComponent(InfoArea);
    alertFixture.detectChanges();
    infoFixture.detectChanges();

    const alertIcons = alertFixture.debugElement.children[0].injector.get(LUCIDE_ICONS);
    const infoIcons = infoFixture.debugElement.children[0].injector.get(LUCIDE_ICONS);

    expect(alertIcons['alert-triangle']).toBeDefined();
    expect(alertIcons['info']).toBeUndefined();
    expect(infoIcons['info']).toBeDefined();
    expect(infoIcons['alert-triangle']).toBeUndefined();
    expect(alertIcons['check']).toBeDefined();
    expect(infoIcons['check']).toBeDefined();
  });
});
