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
  $('#navTop').load(path.nav + "navtop.html");
  $('#navBottom').load(path.nav + "navBottom.html");

  // Single whois
  $('#swMainContainer').load(path.tab + "sw.html");

  // Bulk whois lookup tab/steps
  $('#bwEntry').load(path.bw + "bwEntry.html");

  // File Input containers
  $('#bwFileinputloading').load(path.bw + "bwFileinputloading.html");
  $('#bwFileinputconfirm').load(path.bw + "bwFileinputconfirm.html");

  // Wordlist Input containers
  $('#bwWordlistinput').load(path.bw + "bwWordlistinput.html");
  $('#bwWordlistloading').load(path.bw + "bwWordlistloading.html");
  $('#bwWordlistconfirm').load(path.bw + "bwWordlistconfirm.html");

  // Bulk Processing
  $('#bwProcessing').load(path.bw + "bwProcessing.html");
  $('#bwExport').load(path.bw + "bwExport.html");
  $('#bwExportloading').load(path.bw + "bwExportloading.html");

  // Bulk whois analyser containers
  $('#bwaEntry').load(path.bwa + "bwaEntry.html");
  $('#bwaFileinputloading').load(path.bwa + "bwaFileinputloading.html");

  // bulk domain monitor
  $('#bwmEntry').load(path.bwm + "bwmEntry.html");

  // Wordlist tools containers
  $('#toEntry').load(path.to + "toEntry.html");

  // Options container
  $('#opEntry').load(path.op + "opEntry.html");

  // Help container
  $('#heMainContainer').load(path.tab + "he.html");
}
