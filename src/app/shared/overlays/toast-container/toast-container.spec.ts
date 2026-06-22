import { TestBed } from '@angular/core/testing';

import { provideGestaoDiretaIcons } from '../../../core/constants/lucide-icons';
import { ToastStore } from '../../../core/stores/toast.store';

import { ToastContainer } from './toast-container';

describe('ToastContainer', () => {
  it('should render and remove toasts from the store', async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
      providers: [provideGestaoDiretaIcons()],
    }).compileComponents();

    const store = TestBed.inject(ToastStore);
    store.clear();
    store.success('Operação concluída', 'Descrição do toast.', 0);

    const fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Operação concluída');
    expect(fixture.nativeElement.textContent).toContain('Descrição do toast.');

    const closeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Fechar notificação"]',
    ) as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Operação concluída');
  });
});
