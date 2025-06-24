if (typeof module === 'object') {
  (window as any).module = module;
  // Prevent Electron from treating inline scripts as modules
  (globalThis as any).module = undefined as any;
}

require('./common/fontawesome.js');

(window as any).$ = (window as any).jQuery = require('jquery');
if ((window as any).module) (globalThis as any).module = (window as any).module;

require('./renderer/loadcontents.js');
require('./renderer.js');
