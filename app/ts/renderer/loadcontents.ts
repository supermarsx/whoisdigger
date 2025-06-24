import $ from 'jquery';
import { loadTemplate } from './templateLoader';

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */
(async function loadHtml() {
  await loadTemplate('html', 'mainPanel.hbs');

  return;
})();

//loadHtml();
