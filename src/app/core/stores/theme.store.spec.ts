import { TestBed } from '@angular/core/testing';

import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  let store: ThemeStore;
  let matchMediaMatches = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    matchMediaMatches = false;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) =>
        ({
          matches: query === '(prefers-color-scheme: dark)' ? matchMediaMatches : false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
      ),
    });

    TestBed.configureTestingModule({});
    store = TestBed.inject(ThemeStore);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('should initialize with the saved localStorage theme', () => {
    localStorage.setItem('gd-theme', 'dark');

    store.init();

    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should initialize with the system preference when no theme is saved', () => {
    matchMediaMatches = true;

    store.init();

    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("should add the dark class when setting theme to 'dark'", () => {
    store.setTheme('dark');

    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it("should remove the dark class when setting theme to 'light'", () => {
    document.documentElement.classList.add('dark');

    store.setTheme('light');

    expect(store.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle the current theme', () => {
    store.setTheme('light');

    store.toggleTheme();

    expect(store.theme()).toBe('dark');

    store.toggleTheme();

    expect(store.theme()).toBe('light');
  });

  it('should save the selected theme to localStorage', () => {
    store.setTheme('dark');

    expect(localStorage.getItem('gd-theme')).toBe('dark');
  });
});
