/** global: appSettings */

const whois = require('../../common/whoiswrapper'),
  conversions = require('../../common/conversions'),
  fs = require('fs'),
  debug = require('debug')('renderer.bw.fileinput');

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
ipcRenderer.on('bw:fileinput.confirmation', async function(event, filePath = null, isDragDrop = false) {
  var bwFileStats; // File stats, size, last changed, etc
  const misc = settings['lookup.misc'];
  const lookup = {
    randomize: {
      timeBetween: settings['lookup.randomize.timeBetween']
    }
  };

  debug(filePath);
  if (filePath === undefined || filePath == '' || filePath === null) {
    debug(filePath);
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwLoadingInfo').text('Loading file stats...');
    if (isDragDrop === true) {
      $('#bwEntry').addClass('is-hidden');
      $('#bwFileinputloading').removeClass('is-hidden');
      bwFileStats = await fs.promises.stat(filePath);
      bwFileStats['filename'] = filePath.replace(/^.*[\\\/]/, '');
      bwFileStats['humansize'] = conversions.byteToHumanFileSize(bwFileStats['size'], misc.useStandardSize);
      $('#bwFileSpanInfo').text('Loading file contents...');
      bwFileContents = await fs.promises.readFile(filePath);
    } else {
      bwFileStats = await fs.promises.stat(filePath[0]);
      bwFileStats['filename'] = filePath[0].replace(/^.*[\\\/]/, '');
      bwFileStats['humansize'] = conversions.byteToHumanFileSize(bwFileStats['size'], misc.useStandardSize);
      $('#bwFileSpanInfo').text('Loading file contents...');
      bwFileContents = await fs.promises.readFile(filePath[0]);
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
    debug(bwFileStats['filepreview']);
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwFileinputconfirm').removeClass('is-hidden');

    // stats
    $('#bwFileTdName').text(bwFileStats['filename']);
    $('#bwFileTdLastmodified').text(conversions.getDate(bwFileStats['mtime']));
    $('#bwFileTdLastaccess').text(conversions.getDate(bwFileStats['atime']));
    $('#bwFileTdFilesize').text(bwFileStats['humansize'] + ' ({0} line(s))'.format(bwFileStats['linecount']));
    $('#bwFileTdFilepreview').text(bwFileStats['filepreview'] + '...');
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
    debug('cont:' + bwFileContents);

    debug(bwFileStats['linecount']);
  }

  return;
});

/*
  $('#bwEntryButtonFile').click(function() {...});
    File Input, Entry container button
 */
$(document).on('click', '#bwEntryButtonFile', function() {
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
$(document).on('click', '#bwFileButtonCancel', function() {
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwFileButtonConfirm').click(function() {...});
    File Input, proceed to bulk whois
 */
$(document).on('click', '#bwFileButtonConfirm', function() {
  var bwDomainArray = bwFileContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim);
  var bwTldsArray = $('#bwFileInputTlds').val().toString().split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  debug(bwDomainArray);
  debug(bwTldsArray);

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
      ipcRenderer.send('app:debug', `File(s) you dragged here: ${file.path}`);
      ipcRenderer.send('ondragstart', file.path);
    }
    return false;
  };
})();


/*
  $('#bwMainContainer').on('drop', function(...) {...});
    On Drop ipsum
 */
$('#bwMainContainer').on('drop', function(event) {
  event.preventDefault();
  for (const f of Array.from((event as any).originalEvent.dataTransfer.files)) {
    const file = f as any;
    ipcRenderer.send('app:debug', `File(s) you dragged here: ${file.path}`);
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
