import $ from 'jquery';
import { settings, saveSettings } from '../common/settings';

function applyDarkMode(enabled: boolean): void {
  const link = document.getElementById('dark-theme') as HTMLLinkElement | null;
  if (link) link.disabled = !enabled;
}

$(document).ready(() => {
  const checkbox = $('#theme\\.darkMode');
  const stored = settings.theme?.darkMode ?? false;
  applyDarkMode(stored);
  if (checkbox.length) {
    checkbox.prop('checked', stored);
    checkbox.on('change', function () {
      const state = $(this).is(':checked');
      settings.theme = settings.theme || { darkMode: false };
      settings.theme.darkMode = state;
      saveSettings(settings);
      applyDarkMode(state);
    });
  }
});
