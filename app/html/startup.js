// Ensure Handlebars runtime is loaded before registering partials. The runtime
// is a UMD bundle so we import it for its side effects which expose a global
// `Handlebars` object.
import '../vendor/handlebars.runtime.js';

import registerPartials from '../ts/renderer/registerPartials.js';
registerPartials();

import '../ts/mainPanel.js';
