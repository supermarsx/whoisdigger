var whois = require('../common/whoiswrapper.js');
var conversions = require('../common/conversions.js');

require('../common/stringformat.js');

require('./bulkwhois/wordlistinput.js');
require('./bulkwhois/fileinput.js');
require('./bulkwhois/process.js');
require('./bulkwhois/export.js');

const {
  ipcRenderer
} = require('electron');

// Prevent drag over redirect
document.addEventListener('dragover', function(event) {
  event.preventDefault();
  return false;
}, false);
