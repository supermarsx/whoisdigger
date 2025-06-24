import $ from 'jquery';
import { loadTemplate } from './templateLoader';

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */

(async function loadHtml() {
  // Only inject the full template when the page wasn't
  // loaded from the precompiled HTML file. If the CSP
  // meta tag already exists in the document head,
  // mainPanel.hbs has been rendered and injecting it
  // again would break the DOM and CSP enforcement.
  if (!document.head.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    await loadTemplate('html', 'mainPanel.hbs');
  }

  return;
})();

//loadHtml();
