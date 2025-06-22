// jshint esversion: 8

/*
  loadHtml (self-executing)
    Loads HTML files inside the renderer
 */
(async function loadHtml() {
  var htmlpath = "./";
  var path = {
    nav: htmlpath + "navigation/",
    tab: htmlpath + "tabs/",
  };
  var additionalPaths = {
    bw: htmlpath + path.tab + "bw/",
    bwa: htmlpath + path.tab + "bwa/",
    bwm: htmlpath + path.tab + "bwm/",
    to: htmlpath + path.tab + "to/",
    op: htmlpath + path.tab + "op/"
  };

  Object.assign(path, additionalPaths);

  var {
    bw,
    bwa,
    bwm,
    to,
    op,
    nav,
    tab
  } = path;

  // Navigation bar
  $('#navTop').load(nav + "navTop.html");
  $('#navBottom').load(nav + "navBottom.html");

  // Single whois
  $('#swMainContainer').load(tab + "sw.html");

  // Bulk whois lookup tab/steps
  $('#bwEntry').load(bw + "bwEntry.html");

  // Bulk whois file input
  $('#bwFileinputloading').load(bw + "bwFileinputloading.html");
  $('#bwFileinputconfirm').load(bw + "bwFileinputconfirm.html");

  // Bulk whois wordlist input
  $('#bwWordlistinput').load(bw + "bwWordlistinput.html");
  $('#bwWordlistloading').load(bw + "bwWordlistloading.html");
  $('#bwWordlistconfirm').load(bw + "bwWordlistconfirm.html");

  // Bulk whois processing
  $('#bwProcessing').load(bw + "bwProcessing.html");
  $('#bwExport').load(bw + "bwExport.html");
  $('#bwExportloading').load(bw + "bwExportloading.html");

  // Bulk whois analyser containers
  $('#bwaEntry').load(bwa + "bwaEntry.html");
  $('#bwaFileinputloading').load(bwa + "bwaFileinputloading.html");
  $('#bwaFileinputconfirm').load(bwa + "bwaFileinputconfirm.html");
  $('#bwaProcess').load(bwa + "bwaProcess.html");
  $('#bwaAnalyser').load(bwa + "bwaAnalyser.html");

  // Wordlist tools containers
  $('#toEntry').load(to + "toEntry.html");

  // Options container
  $('#opEntry').load(op + "opEntry.html");

  // Help container
  $('#heMainContainer').load(tab + "he.html");

  return;
})();

//loadHtml();
