import $ from 'jquery';
import { loadTemplate } from './templateLoader';

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */
async function loadHtml(): Promise<void> {
  await loadTemplate('html', 'mainPanel.hbs');
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    void loadHtml();
  });
} else {
  void loadHtml();
}

//loadHtml();
