if (typeof module === 'object') {
  (window as any).module = module;
  // Prevent Electron from treating inline scripts as modules
  module = undefined as any;
}

require('./common/fontawesome.js');

(window as any).$ = (window as any).jQuery = require('jquery');
if ((window as any).module) module = (window as any).module;

require('./renderer/loadcontents.js');
require('./renderer.js');
