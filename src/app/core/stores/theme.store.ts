import { computed, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const storageKey = 'gd-theme';
const darkClass = 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  readonly theme = signal<ThemeMode>('light');
  readonly isDark = computed(() => this.theme() === 'dark');

  init(): void {
    this.applyTheme(this.resolveInitialTheme(), false);
  }

  setTheme(theme: ThemeMode): void {
    this.applyTheme(theme, true);
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private resolveInitialTheme(): ThemeMode {
    const storedTheme = this.readStoredTheme();

    if (storedTheme) {
      return storedTheme;
    }

    return this.prefersDarkTheme() ? 'dark' : 'light';
  }

  private applyTheme(theme: ThemeMode, persist: boolean): void {
    this.theme.set(theme);
    this.documentElement()?.classList.toggle(darkClass, theme === 'dark');

    if (persist) {
      this.localStorage()?.setItem(storageKey, theme);
    }
  }

  private readStoredTheme(): ThemeMode | null {
    const storedTheme = this.localStorage()?.getItem(storageKey);

    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
  }

  private prefersDarkTheme(): boolean {
    return this.window()?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private documentElement(): HTMLElement | null {
    return typeof document === 'undefined' ? null : document.documentElement;
  }

  private localStorage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  private window(): Window | null {
    return typeof window === 'undefined' ? null : window;
  }
}
