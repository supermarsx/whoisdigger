
import $ from 'jquery';

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */
(async function loadHtml() {
  const htmlpath = "./";
  const path: Record<string, string> = {
    nav: htmlpath + "navigation/",
    tab: htmlpath + "tabs/",
  };
  const additionalPaths: Record<string, string> = {
    bw: htmlpath + path.tab + "bulkwhois/",
    bwa: htmlpath + path.tab + "bulkwhoisanalyser/",
    bwm: htmlpath + path.tab + "bwm/",
    to: htmlpath + path.tab + "to/",
    op: htmlpath + path.tab + "options/"
  };

  Object.assign(path, additionalPaths);

  const {
    bw: bulkwhois,
    bwa: bulkwhoisanalyser,
    bwm,
    to,
    op: options,
    nav,
    tab
  } = path;

  // Navigation bar
  $('#navTop').load(nav + "navTop.html");
  $('#navBottom').load(nav + "navBottom.html");

  // Single whois
  $('#singlewhoisMainContainer').load(tab + "singlewhois.html");

  // Bulk whois lookup tab/steps
  $('#bwEntry').load(bulkwhois + "bulkwhoisEntry.html");

  // Bulk whois file input
  $('#bwFileinputloading').load(bulkwhois + "bulkwhoisFileInputLoading.html");
  $('#bwFileinputconfirm').load(bulkwhois + "bulkwhoisFileInputConfirm.html");

  // Bulk whois wordlist input
  $('#bwWordlistinput').load(bulkwhois + "bulkwhoisWordlistInput.html");
  $('#bwWordlistloading').load(bulkwhois + "bulkwhoisWordlistLoading.html");
  $('#bwWordlistconfirm').load(bulkwhois + "bulkwhoisWordlistConfirm.html");

  // Bulk whois processing
  $('#bwProcessing').load(bulkwhois + "bulkwhoisProcessing.html");
  $('#bwExport').load(bulkwhois + "bulkwhoisExport.html");
  $('#bwExportloading').load(bulkwhois + "bulkwhoisExportLoading.html");

  // Bulk whois analyser containers
  $('#bwaEntry').load(bulkwhoisanalyser + "bulkwhoisanalyserEntry.html");
  $('#bwaFileinputloading').load(bulkwhoisanalyser + "bulkwhoisanalyserFileInputLoading.html");
  $('#bwaFileinputconfirm').load(bulkwhoisanalyser + "bulkwhoisanalyserFileinputconfirm.html");
  $('#bwaProcess').load(bulkwhoisanalyser + "bulkwhoisanalyserProcess.html");
  $('#bulkwhoisanalyser').load(bulkwhoisanalyser + "bulkwhoisanalyserAnalyser.html");

  // Wordlist tools containers
  $('#toEntry').load(to + "toEntry.html");

  // Options container
  $('#opEntry').load(options + "optionsEntry.html");

  // Help container
  $('#heMainContainer').load(tab + "he.html");

  return;
})();

//loadHtml();
