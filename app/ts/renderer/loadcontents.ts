import $ from 'jquery';
import { loadTemplate } from './templateLoader';

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */
(async function loadHtml() {

  // Navigation bar
  await loadTemplate('#navTop', 'navTop.hbs');
  await loadTemplate('#navBottom', 'navBottom.hbs');

  // Single whois
  await loadTemplate('#singlewhoisMainContainer', 'singlewhois.hbs');

  // Bulk whois lookup tab/steps
  await loadTemplate('#bwEntry', 'bwEntry.hbs');

  // Bulk whois file input
  await loadTemplate('#bwFileinputloading', 'bwFileInputLoading.hbs');
  await loadTemplate('#bwFileinputconfirm', 'bwFileInputConfirm.hbs');

  // Bulk whois wordlist input
  await loadTemplate('#bwWordlistinput', 'bwWordlistInput.hbs');
  await loadTemplate('#bwWordlistloading', 'bwWordlistLoading.hbs');
  await loadTemplate('#bwWordlistconfirm', 'bwWordlistConfirm.hbs');

  // Bulk whois processing
  await loadTemplate('#bwProcessing', 'bwProcessing.hbs');
  await loadTemplate('#bwExport', 'bwExport.hbs');
  await loadTemplate('#bwExportloading', 'bwExportLoading.hbs');

  // Bulk whois analyser containers
  await loadTemplate('#bwaEntry', 'bwaEntry.hbs');
  await loadTemplate('#bwaFileinputloading', 'bwaFileInputLoading.hbs');
  await loadTemplate('#bwaFileinputconfirm', 'bwaFileinputconfirm.hbs');
  await loadTemplate('#bwaProcess', 'bwaProcess.hbs');
  await loadTemplate('#bwaAnalyser', 'bwaAnalyser.hbs');

  // Wordlist tools containers
  await loadTemplate('#toEntry', 'toEntry.hbs');

  // Options container
  await loadTemplate('#opEntry', 'opEntry.hbs');

  // Help container
  await loadTemplate('#heMainContainer', 'he.hbs');

  return;
})();

//loadHtml();
