loadhtml();

function loadhtml() {
  var htmlpath = "./";
  var path = {
    nav: htmlpath + "navigation/",
    tab: htmlpath + "tabs/",
  }
  path.bw = htmlpath + path.tab + "bw/";
  path.bwa = htmlpath + path.tab + "bwa/";
  path.bwm = htmlpath + path.tab + "bwm/";
  path.to = htmlpath + path.tab + "to/";
  path.op = htmlpath + path.tab + "op/";

  // Navbar loading
  $('#navbar-top').load(path.nav + "navbar-top.html");
  $('#navbar-bottom').load(path.nav + "navbar-bottom.html");

  // Single whois
  $('#swMainContainer').load(path.tab + "sw.html");

  // Bulk whois lookup tab/steps
  $('#bwEntry').load(path.bw + "bwEntry.html");
  // File Input containers
  $('#bwFileInputLoading').load(path.bw + "bwFileInputLoading.html");
  $('#bwFileInputConfirm').load(path.bw + "bwFileInputConfirm.html");
  // Wordlist Input containers
  $('#bwWordlistInput').load(path.bw + "bwWordlistInput.html");
  $('#bwWordlistLoading').load(path.bw + "bwWordlistLoading.html");
  $('#bwWordlistConfirm').load(path.bw + "bwWordlistConfirm.html");
  // Bulk Processing
  $('#bwProcessing').load(path.bw + "bwProcessing.html");
  $('#bwExport').load(path.bw + "bwExport.html");
  $('#bwExportLoading').load(path.bw + "bwExportLoading.html");

  // Bulk whois analyser containers
  $('#bwaEntry').load(path.bwa + "bwaEntry.html");
  $('#bwaFileInputLoading').load(path.bwa + "bwaFileInputLoading.html");

  // bulk domain monitor
  $('#bwmEntry').load(path.bwm + "bwmEntry.html");

  // Wordlist tools containers
  $('#toEntry').load(path.to + "toEntry.html");

  // Options container
  $('#opEntry').load(path.op + "opEntry.html");

  // Help container
  $('#heMainContainer').load(path.tab + "he.html");
}
