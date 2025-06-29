import './common/fontawesome.js';
import $ from '../vendor/jquery.js';
(window as any).$ = (window as any).jQuery = $;

// The main HTML file is precompiled and loaded directly, so loading
// additional content at runtime is unnecessary.
// import './renderer/loadcontents.js';
import './renderer.js';
