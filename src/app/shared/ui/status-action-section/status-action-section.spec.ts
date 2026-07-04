import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusActionSection } from './status-action-section';

describe('StatusActionSection', () => {
  let fixture: ComponentFixture<StatusActionSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusActionSection],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(StatusActionSection);
    fixture.componentRef.setInput('title', 'Status da Fazenda');
    fixture.componentRef.setInput(
      'description',
      'Inative esta fazenda caso ela não deva mais ser usada no sistema.',
    );
    fixture.detectChanges();
  }

  it('should render the title', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Status da Fazenda');
  });

  it('should render the description', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain(
      'Inative esta fazenda caso ela não deva mais ser usada no sistema.',
    );
  });

  it('should render the optional badge when configured', () => {
    createComponent();
    fixture.componentRef.setInput('badgeLabel', 'Ativa');
    fixture.componentRef.setInput('badgeVariant', 'success');
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('gd-badge');

    expect(badge?.textContent).toContain('Ativa');
    expect(badge?.querySelector('span')?.className).toContain('bg-success');
  });

  it('should not render the optional badge by default', () => {
    createComponent();

    expect((fixture.nativeElement as HTMLElement).querySelector('gd-badge')).toBeNull();
  });

  it('should render the action button when showAction is true', () => {
    createComponent();
    fixture.componentRef.setInput('actionLabel', 'Inativar fazenda');
    fixture.componentRef.setInput('showAction', true);
    fixture.detectChanges();

    expect(findButton('Inativar fazenda')).toBeTruthy();
  });

  it('should not render the action button when showAction is false', () => {
    createComponent();
    fixture.componentRef.setInput('actionLabel', 'Inativar fazenda');
    fixture.componentRef.setInput('showAction', false);
    fixture.detectChanges();

    expect(findButton('Inativar fazenda')).toBeUndefined();
  });

  it('should emit action when the action button is clicked', () => {
    createComponent();
    const actionSpy = vi.fn();
    fixture.componentInstance.action.subscribe(actionSpy);
    fixture.componentRef.setInput('actionLabel', 'Inativar fazenda');
    fixture.detectChanges();

    findButton('Inativar fazenda')?.click();

    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('should respect actionDisabled', () => {
    createComponent();
    const actionSpy = vi.fn();
    fixture.componentInstance.action.subscribe(actionSpy);
    fixture.componentRef.setInput('actionLabel', 'Inativar fazenda');
    fixture.componentRef.setInput('actionDisabled', true);
    fixture.detectChanges();

    const button = findButton('Inativar fazenda') as HTMLButtonElement;
    button.click();

    expect(button.disabled).toBe(true);
    expect(actionSpy).not.toHaveBeenCalled();
  });

  it('should apply the configured action variant', () => {
    createComponent();
    fixture.componentRef.setInput('actionLabel', 'Inativar fazenda');
    fixture.componentRef.setInput('actionVariant', 'danger');
    fixture.detectChanges();

    expect(findButton('Inativar fazenda')?.className).toContain('bg-danger');
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    const root = fixture.nativeElement as HTMLElement;

    return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }
});
