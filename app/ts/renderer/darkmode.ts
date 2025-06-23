import $ from 'jquery';
import { settings, saveSettings } from '../common/settings';

function applyDarkMode(enabled: boolean): void {
  const html = document.documentElement;
  if (enabled) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }
}

$(document).ready(() => {
  const select = $('#theme\\.darkMode');
  const stored = settings.theme?.darkMode ?? false;
  applyDarkMode(stored);
  if (select.length) {
    select.val(stored ? 'true' : 'false');
    select.on('change', () => {
      const state = select.val() === 'true';
      settings.theme = settings.theme || { darkMode: false };
      settings.theme.darkMode = state;
      void saveSettings(settings);
      applyDarkMode(state);
    });
  }
});
