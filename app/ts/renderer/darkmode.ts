import $ from '../../vendor/jquery.js';
import { settings, saveSettings } from './settings-renderer.js';

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

$(document).ready(() => {
  const darkSelect = $('#theme\\.darkMode');
  const systemSelect = $('#theme\\.followSystem');
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const applyFromSettings = (): void => {
    const useSystem = settings.theme?.followSystem ?? false;
    const isDark = useSystem ? mediaQuery.matches : settings.theme?.darkMode ?? false;
    applyDarkMode(isDark);
    if (darkSelect.length) darkSelect.val(settings.theme?.darkMode ? 'true' : 'false');
    if (systemSelect.length) systemSelect.val(useSystem ? 'true' : 'false');
  };

  applyFromSettings();

  mediaQuery.addEventListener('change', () => {
    if (settings.theme?.followSystem) {
      applyDarkMode(mediaQuery.matches);
    }
  });

  if (darkSelect.length) {
    darkSelect.on('change', () => {
      const state = darkSelect.val() === 'true';
      settings.theme = settings.theme || { darkMode: false, followSystem: false };
      settings.theme.darkMode = state;
      void saveSettings(settings);
      if (!settings.theme.followSystem) {
        applyDarkMode(state);
      }
    });
  }

  if (systemSelect.length) {
    systemSelect.on('change', () => {
      const state = systemSelect.val() === 'true';
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
