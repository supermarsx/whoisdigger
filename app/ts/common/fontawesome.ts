// Font Awesome setup for Electron renderer
// Import the full Font Awesome library so icons render in HTML
// but guard against missing dependencies when packaging
import { errorFactory } from './logger.js';

const error = errorFactory('fontawesome');

async function loadFontAwesome(): Promise<void> {
  try {
    const url = new URL('../../vendor/fontawesome.js', import.meta.url);
    await import(url.href);
  } catch (err) {
    error(`Failed to load Font Awesome: ${err}`);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    void loadFontAwesome();
  });
} else {
  void loadFontAwesome();
}
