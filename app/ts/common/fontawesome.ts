// Font Awesome setup for Electron renderer
// Import the full Font Awesome library so icons render in HTML
// but guard against missing dependencies when packaging
(async () => {
  try {
    await import('@fortawesome/fontawesome-free/js/all.js');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load Font Awesome:', err);
  }
})();