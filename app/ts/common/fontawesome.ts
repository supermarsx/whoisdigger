// Font Awesome setup for Electron renderer
// Import the full Font Awesome library so icons render in HTML
// but guard against missing dependencies when packaging
async function loadFontAwesome(): Promise<void> {
  try {
    const url = new URL(
      '../../../node_modules/@fortawesome/fontawesome-free/js/all.js',
      import.meta.url
    );
    await import(url.href);
  } catch (err) {
    console.error('Failed to load Font Awesome:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    void loadFontAwesome();
  });
} else {
  void loadFontAwesome();
}
