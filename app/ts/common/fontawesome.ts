// Font Awesome setup for Electron renderer
// Import the full Font Awesome library so icons render in HTML
// but guard against missing dependencies when packaging
try {
  require('@fortawesome/fontawesome-free/js/all.js');
} catch (err) {
  console.error('Failed to load Font Awesome:', err);
}
