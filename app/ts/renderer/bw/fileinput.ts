// jshint esversion: 8, -W069
/** global: appSettings */

const whois = require('../../common/whoiswrapper'),
  conversions = require('../../common/conversions'),
  fs = require('fs');

const {
  ipcRenderer
} = require('electron'), {
  tableReset
} = require('./auxiliary');

require('../../common/stringformat');

var bwFileContents;

/*
  ipcRenderer.on('bw:fileinput.confirmation', function(...) {...});
    // File input, path and information confirmation container
  parameters
    event
    filePath
    isDragDrop
 */
ipcRenderer.on('bw:fileinput.confirmation', function(event, filePath = null, isDragDrop = false) {
  var bwFileStats; // File stats, size, last changed, etc
  const misc = settings['lookup.misc'];
  const lookup = {
    randomize: {
      timeBetween: settings['lookup.randomize.timeBetween']
    }
  };

  //console.log(filePath);
  if (filePath === undefined || filePath == '' || filePath === null) {
    //console.log(filePath);
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwLoadingInfo').text('Loading file stats...');
    if (isDragDrop === true) {
      $('#bwEntry').addClass('is-hidden');
      $('#bwFileinputloading').removeClass('is-hidden');
      bwFileStats = fs.statSync(filePath);
      bwFileStats['filename'] = filePath.replace(/^.*[\\\/]/, '');
      bwFileStats['humansize'] = conversions.byteToHumanFileSize(bwFileStats['size'], misc.useStandardSize);
      $('#bwFileSpanInfo').text('Loading file contents...');
      bwFileContents = fs.readFileSync(filePath);
    } else {
      bwFileStats = fs.statSync(filePath[0]);
      bwFileStats['filename'] = filePath[0].replace(/^.*[\\\/]/, '');
      bwFileStats['humansize'] = conversions.byteToHumanFileSize(bwFileStats['size'], misc.useStandardSize);
      $('#bwFileSpanInfo').text('Loading file contents...');
      bwFileContents = fs.readFileSync(filePath[0]);
    }
    $('#bwFileSpanInfo').text('Getting line count...');
    bwFileStats['linecount'] = bwFileContents.toString().split('\n').length;

    if (lookup.randomize.timeBetween.randomize === true) {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timeBetween.minimum);
      bwFileStats['maxestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timeBetween.maximum);

      $('#bwFileSpanTimebetweenmin').text('{0}ms '.format(lookup.randomize.timeBetween.minimum));
      $('#bwFileSpanTimebetweenmax').text('/ {0}ms'.format(lookup.randomize.timeBetween.maximum));
      $('#bwFileTdEstimate').text('{0} to {1}'.format(bwFileStats['minestimate'], bwFileStats['maxestimate']));
    } else {
      bwFileStats['minestimate'] = conversions.msToHumanTime(
        bwFileStats['linecount'] * settings['lookup.general'].timeBetween
      );
      $('#bwFileSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwFileSpanTimebetweenmin').text(
        settings['lookup.general'].timeBetween + 'ms'
      );
      $('#bwFileTdEstimate').text('> {0}'.format(bwFileStats['minestimate']));
    }



    bwFileStats['filepreview'] = bwFileContents.toString().substring(0, 50);
    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwFileinputconfirm').removeClass('is-hidden');

    // stats
    $('#bwFileTdName').text(bwFileStats['filename']);
    $('#bwFileTdLastmodified').text(conversions.getDate(bwFileStats['mtime']));
    $('#bwFileTdLastaccess').text(conversions.getDate(bwFileStats['atime']));
    $('#bwFileTdFilesize').text(bwFileStats['humansize'] + ' ({0} line(s))'.format(bwFileStats['linecount']));
    $('#bwFileTdFilepreview').text(bwFileStats['filepreview'] + '...');
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
    //console.log('cont:'+ bwFileContents);

    //console.log(bwFileStats['linecount']);
  }

  return;
});

/*
  $('#bwEntryButtonFile').click(function() {...});
    File Input, Entry container button
 */
$('#bwEntryButtonFile').click(function() {
  $('#bwEntry').addClass('is-hidden');
  $.when($('#bwFileinputloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bw:input.file");
  });

  return;
});

/*
  $('#bwFileButtonCancel').click(function() {...});
    File Input, cancel file confirmation
 */
$('#bwFileButtonCancel').click(function() {
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwFileButtonConfirm').click(function() {...});
    File Input, proceed to bulk whois
 */
$('#bwFileButtonConfirm').click(function() {
  var bwDomainArray = bwFileContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim);
  var bwTldsArray = $('#bwFileInputTlds').val().toString().split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  /*
  console.log(bwDomainArray);
  console.log(bwTldsArray);
  */

  ipcRenderer.send("bw:lookup", bwDomainArray, bwTldsArray);
});

/*
  dragDropInitialization (self-executing)
    Bulk whois file input by drag and drop
 */
(function dragDropInitialization() {
  const holder = document.getElementById('bwMainContainer') as HTMLElement;
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
    for (const f of Array.from(event.dataTransfer!.files)) {
      const file = f as any;
      ipcRenderer.send('File(s) you dragged here: {0}'.format(file.path));
      ipcRenderer.send('ondragstart', file.path);
    }
    return false;
  };
})();

/*
$("html").on("dragover", function(event) {
    event.preventDefault();
    event.stopPropagation();
  console.log('dragging');
});

$("html").on("dragleave", function(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('dragging');
});

$("html").on("drop", function(event) {
    event.preventDefault();
    event.stopPropagation();
    alert("Dropped!");
});*/

/*
  $('#bwMainContainer').on('drop', function(...) {...});
    On Drop ipsum
 */
$('#bwMainContainer').on('drop', function(event) {
  event.preventDefault();
  for (const f of Array.from((event as any).originalEvent.dataTransfer.files)) {
    const file = f as any;
    ipcRenderer.send('File(s) you dragged here: {0}'.format(file.path));
    ipcRenderer.send('ondragstart', file.path);
  }

  return false;
});

/*
  $('#bwFileInputTlds').keyup(function(...) {...});
    ipsum
 */
$('#bwFileInputTlds').keyup(function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwFileButtonConfirm').click();
  }

  return;
});
