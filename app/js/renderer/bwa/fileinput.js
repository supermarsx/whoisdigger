/** global: appSettings */
var whois = require('../../common/whoiswrapper.js'),
  conversions = require('../../common/conversions.js'),
  fs = require('fs'),
  bwaFileContents;


require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

// File input, path and information confirmation container
ipcRenderer.on('bwa:fileinput.confirmation', function(event, filePath = null, isDragDrop = false) {
  const {
    misc,
    lookup
  } = appSettings;
  var bwaFileStats; // File stats, size, last changed, etc

  //console.log(filePath);
  if (filePath === undefined || filePath == '' || filePath === null) {
    //console.log(filePath);
    $('#bwaFileinputloading').addClass('is-hidden');
    $('#bwaEntry').removeClass('is-hidden');
  } else {

    $('#bwaFileSpanInfo').text('Loading file stats...');
    if (isDragDrop === true) {
      $('#bwaEntry').addClass('is-hidden');
      $('#bwaFileinputloading').removeClass('is-hidden');
      bwaFileStats = fs.statSync(filePath);
      bwaFileStats['filename'] = filePath.replace(/^.*[\\\/]/, '');
      bwaFileStats['humansize'] = conversions.byteToHumanFileSize(bwaFileStats['size'], misc.usestandardsize);
      $('#bwaFileSpanInfo').text('Loading file contents...');
      bwaFileContents = fs.readFileSync(filePath);
    } else {
      bwaFileStats = fs.statSync(filePath[0]);
      bwaFileStats['filename'] = filePath[0].replace(/^.*[\\\/]/, '');
      bwaFileStats['humansize'] = conversions.byteToHumanFileSize(bwaFileStats['size'], misc.usestandardsize);
      $('#bwaFileSpanInfo').text('Loading file contents...');
      bwaFileContents = fs.readFileSync(filePath[0]);
    }
    $('#bwaFileSpanInfo').text('Getting line count...');
    bwaFileStats['linecount'] = bwaFileContents.toString().split('\n').length;
    bwaFileStats['filepreview'] = bwaFileContents.toString().substring(0, 50);

    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwaFileinputloading').addClass('is-hidden');
    $('#bwaFileinputconfirm').removeClass('is-hidden');

    // stats
    $('#bwaFileTdFilename').text(bwaFileStats['filename']);
    $('#bwaFileTdLastmodified').text(conversions.getDate(bwaFileStats['mtime']));
    $('#bwaFileTdLastaccessed').text(conversions.getDate(bwaFileStats['atime']));
    $('#bwaFileTdFilesize').text(bwaFileStats['humansize'] + ' ({0} line(s))'.format(bwaFileStats['linecount']));
    $('#bwaFileTdFilepreview').text(bwaFileStats['filepreview'] + '...');
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
    //console.log('cont:'+ bwFileContents);

    //console.log(bwFileStats['linecount']);
  }
});

// File Input, Entry container button
$('#bwaEntryButtonOpen').click(function() {
  $('#bwaEntry').addClass('is-hidden');
  $.when($('#bwaFileinputloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bwa:input.file");
  });
});


// File Input, cancel file confirmation
$('#bwaFileinputconfirmButtonCancel').click(function() {
  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaEntry').removeClass('is-hidden');
});
/*
// File Input, proceed to bulk whois
$('#bwafButtonConfirm').click(function() {
  var bwDomainArray = bwFileContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim);
  var bwTldsArray = $('#bwfSearchTlds').val().toString().split(',');

  $('#bwFileInputConfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  ipcRenderer.send("bulkwhois:lookup", bwDomainArray, bwTldsArray);
});

// Bulk whois file input by drag and drop
(function() {
  var holder = document.getElementById('bwaMainContainer');
  holder.ondragover = function() {
    return false;
  };

  holder.ondragleave = function() {
    return false;
  };

  holder.ondragend = function() {
    return false;
  };

  holder.ondrop = function(event) {
    event.preventDefault();
    for (let f of event.dataTransfer.files) {
      ipcRenderer.send('File(s) you dragged here: {0}'.format(f.path));
      ipcRenderer.send('ondragstart', f.path);
    }
    return false;
  };
})();

// Enter when confirming file input bulk whois
document.getElementById('bwfSearchTlds').addEventListener("keyup", function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwfButtonConfirm').click();
  }
});
*/
