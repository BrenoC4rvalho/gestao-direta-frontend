import { vi } from 'vitest';

import { ToastStore } from './toast.store';

const enterDurationMs = 16;
const leaveDurationMs = 250;

describe('ToastStore', () => {
  let store: ToastStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new ToastStore();
  });

  afterEach(() => {
    store.clear();
    vi.useRealTimers();
  });

  it('should create toasts as entering and mark them visible on the next frame', () => {
    const id = store.success('Operação concluída', 'Descrição do toast.', 0);

    expect(store.toasts()).toEqual([
      expect.objectContaining({
        id,
        type: 'success',
        title: 'Operação concluída',
        description: 'Descrição do toast.',
        duration: 0,
        state: 'entering',
      }),
    ]);

    vi.advanceTimersByTime(enterDurationMs);

    expect(store.toasts()[0]?.state).toBe('visible');
  });

  it('should mark expired toasts as leaving before removing them', () => {
    store.info('Sessão encerrada', undefined, 500);
    vi.advanceTimersByTime(enterDurationMs);

    expect(store.toasts()[0]?.state).toBe('visible');

    vi.advanceTimersByTime(500 - enterDurationMs);

    expect(store.toasts()[0]?.state).toBe('leaving');
    expect(store.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(leaveDurationMs);

    expect(store.toasts()).toHaveLength(0);
  });

  it('should not remove manually dismissed toasts immediately', () => {
    const id = store.warning('Atenção', undefined, 0);
    vi.advanceTimersByTime(enterDurationMs);

    store.remove(id);

    expect(store.toasts()[0]?.state).toBe('leaving');
    expect(store.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(leaveDurationMs - 1);

    expect(store.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);

    expect(store.toasts()).toHaveLength(0);
  });

  it('should ignore duplicate remove calls while a toast is leaving', () => {
    const id = store.error('Falha ao salvar', undefined, 0);
    vi.advanceTimersByTime(enterDurationMs);

    store.remove(id);
    store.remove(id);

    expect(store.toasts()[0]?.state).toBe('leaving');

    vi.advanceTimersByTime(leaveDurationMs);

    expect(store.toasts()).toHaveLength(0);
  });

  it('should clear toasts and timers immediately', () => {
    store.success('Primeiro', undefined, 500);
    store.error('Segundo', undefined, 1000);

    expect(store.toasts()).toHaveLength(2);

    store.clear();

    expect(store.toasts()).toHaveLength(0);

    vi.advanceTimersByTime(2000);

    expect(store.toasts()).toHaveLength(0);
  });
});
