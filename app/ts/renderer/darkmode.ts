import { settings, saveSettings } from './settings-renderer.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.darkmode');
debug('loaded');

function applyDarkMode(enabled: boolean): void {
  const html = document.documentElement;
  if (enabled) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }
}

function getSystemPref(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

document.addEventListener('DOMContentLoaded', () => {
  const darkSelect = document.getElementById('theme.darkMode') as HTMLSelectElement | null;
  const systemSelect = document.getElementById('theme.followSystem') as HTMLSelectElement | null;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyFromSettings = (): void => {
    const useSystem = settings.theme?.followSystem ?? false;
    const isDark = useSystem ? mediaQuery.matches : settings.theme?.darkMode ?? false;
    applyDarkMode(isDark);
    if (darkSelect) darkSelect.value = settings.theme?.darkMode ? 'true' : 'false';
    if (systemSelect) systemSelect.value = useSystem ? 'true' : 'false';
  };

  applyFromSettings();

  mediaQuery.addEventListener('change', () => {
    if (settings.theme?.followSystem) {
      applyDarkMode(mediaQuery.matches);
    }
  });

  if (darkSelect) {
    darkSelect.addEventListener('change', () => {
      const state = darkSelect.value === 'true';
      settings.theme = settings.theme || { darkMode: false, followSystem: false };
      settings.theme.darkMode = state;
      void saveSettings(settings);
      if (!settings.theme.followSystem) {
        applyDarkMode(state);
      }
    });
  }

  if (systemSelect) {
    systemSelect.addEventListener('change', () => {
      const state = systemSelect.value === 'true';
      settings.theme = settings.theme || { darkMode: false, followSystem: false };
      settings.theme.followSystem = state;
      void saveSettings(settings);
      applyDarkMode(state ? mediaQuery.matches : settings.theme.darkMode ?? false);
    });
  }

  window.addEventListener('settings-loaded', () => {
    applyFromSettings();
  });
});
