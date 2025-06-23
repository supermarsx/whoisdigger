import $ from 'jquery';

function applyDarkMode(enabled: boolean): void {
  const link = document.getElementById('dark-theme') as HTMLLinkElement | null;
  if (link) link.disabled = !enabled;
}

$(document).ready(() => {
  const checkbox = $('#theme\\.darkMode');
  const stored = localStorage.getItem('darkMode') === 'true';
  applyDarkMode(stored);
  if (checkbox.length) {
    checkbox.prop('checked', stored);
    checkbox.on('change', function () {
      const state = $(this).is(':checked');
      localStorage.setItem('darkMode', String(state));
      applyDarkMode(state);
    });
  }
});
