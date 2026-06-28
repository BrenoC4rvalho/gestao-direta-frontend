import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { ToastStore } from '../../../core/stores/toast.store';

import { ToastContainer } from './toast-container';

const enterDurationMs = 20;
const leaveDurationMs = 260;

describe('ToastContainer', () => {
  let fixture: ComponentFixture<ToastContainer>;
  let store: ToastStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    store = TestBed.inject(ToastStore);
    store.clear();
    fixture = TestBed.createComponent(ToastContainer);
  });

  afterEach(() => {
    store.clear();
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('should render toasts from the store', async () => {
    store.success('Operação concluída', 'Descrição do toast.', 0);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Operação concluída');
    expect(fixture.nativeElement.textContent).toContain('Descrição do toast.');
    expect(toast().classList.contains('opacity-0')).toBe(true);

    await completeEnterAnimation();

    expect(toast().classList.contains('opacity-100')).toBe(true);
    expect(toast().classList.contains('translate-y-0')).toBe(true);
  });

  it('should apply transition classes based on toast state', async () => {
    store.warning('Atenção', undefined, 0);
    fixture.detectChanges();

    expect(toast().classList.contains('transition-[opacity,transform]')).toBe(true);
    expect(toast().classList.contains('duration-[250ms]')).toBe(true);
    expect(toast().classList.contains('translate-y-2')).toBe(true);
    expect(toast().classList.contains('scale-[0.98]')).toBe(true);
    expect(toast().classList.contains('opacity-0')).toBe(true);

    await completeEnterAnimation();

    expect(toast().classList.contains('translate-y-0')).toBe(true);
    expect(toast().classList.contains('scale-100')).toBe(true);
    expect(toast().classList.contains('opacity-100')).toBe(true);
  });

  it('should start exit animation before removing a toast from the store', async () => {
    store.success('Operação concluída', 'Descrição do toast.', 0);
    fixture.detectChanges();
    await completeEnterAnimation();

    closeButton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Operação concluída');
    expect(toast().classList.contains('opacity-0')).toBe(true);
    expect(toast().classList.contains('translate-y-2')).toBe(true);
    expect(store.toasts()[0]?.state).toBe('leaving');

    await completeLeaveAnimation();

    expect(fixture.nativeElement.textContent).not.toContain('Operação concluída');
    expect(store.toasts()).toHaveLength(0);
  });

  async function completeEnterAnimation(): Promise<void> {
    await wait(enterDurationMs);
    fixture.detectChanges();
  }

  async function completeLeaveAnimation(): Promise<void> {
    await wait(leaveDurationMs);
    fixture.detectChanges();
  }

  function toast(): HTMLElement {
    return fixture.nativeElement.querySelector('article') as HTMLElement;
  }

  function closeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      'button[aria-label="Fechar notificação"]',
    ) as HTMLButtonElement;
  }
});

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
