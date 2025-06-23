
/** global: settings */
import * as conversions from '../../common/conversions';
import fs from 'fs';
import type { FileStats } from '../../common/fileStats';
import Papa from 'papaparse';
import datatables from 'datatables';
const dt = datatables();
import { settings } from '../../common/settings';

import { ipcRenderer } from 'electron';

import { formatString } from '../../common/stringformat';

let bwaFileContents: any;

/*
  ipcRenderer.on('bwa:fileinput.confirmation', function(...) {...});
    File input, path and information confirmation container
 */
ipcRenderer.on('bwa:fileinput.confirmation', function(event, filePath: string | string[] | null = null, isDragDrop = false) {
  let bwaFileStats: FileStats; // File stats, size, last changed, etc

  $('#bwaFileSpanInfo').text('Waiting for file...');

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
      bwaFileStats = fs.statSync(filePath as string) as FileStats;
      bwaFileStats.filename = (filePath as string).replace(/^.*[\\\/]/, '');
      bwaFileStats.humansize = conversions.byteToHumanFileSize(bwaFileStats.size, settings['lookup.misc'].useStandardSize);
      $('#bwaFileSpanInfo').text('Loading file contents...');
      bwaFileContents = Papa.parse(fs.readFileSync(filePath as string).toString(), {
        header: true
      });
    } else {
      bwaFileStats = fs.statSync((filePath as string[])[0]) as FileStats;
      bwaFileStats.filename = (filePath as string[])[0].replace(/^.*[\\\/]/, '');
      bwaFileStats.humansize = conversions.byteToHumanFileSize(bwaFileStats.size, settings['lookup.misc'].useStandardSize);
      $('#bwaFileSpanInfo').text('Loading file contents...');
      bwaFileContents = Papa.parse(fs.readFileSync((filePath as string[])[0]).toString(), {
        header: true
      });
    }
    //console.log(bwaFileContents.data[0]);
    $('#bwaFileSpanInfo').text('Getting line count...');
    bwaFileStats.linecount = bwaFileContents.data.length;
    try {
      bwaFileStats.filepreview = JSON.stringify(bwaFileContents.data[0], null, "\t").substring(0, 50);
    } catch (e) {
      bwaFileStats.filepreview = '';
    }
    bwaFileStats.errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
    //console.log(bwaFileContents.data);

    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwaFileinputloading').addClass('is-hidden');
    $('#bwaFileinputconfirm').removeClass('is-hidden');

    // stats
    $('#bwaFileTdFilename').text(String(bwaFileStats.filename));
    $('#bwaFileTdLastmodified').text(conversions.getDate(bwaFileStats.mtime) ?? '');
    $('#bwaFileTdLastaccessed').text(conversions.getDate(bwaFileStats.atime) ?? '');
    $('#bwaFileTdFilesize').text(String(bwaFileStats.humansize) + formatString(' ({0} record(s))', String(bwaFileStats.linecount)));
    $('#bwaFileTdFilepreview').text(String(bwaFileStats.filepreview) + '...');
    $('#bwaFileTextareaErrors').text(String(bwaFileStats.errors || "No errors"));
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
    //console.log('cont:'+ bwFileContents);

    //console.log(bwFileStats['linecount']);
  }

  return;
});

/*
  $('#bwaEntryButtonOpen').click(function() {...});
    Bulk whois, file input, entry container button
 */
$('#bwaEntryButtonOpen').click(function() {
  $('#bwaEntry').addClass('is-hidden');
  $.when($('#bwaFileinputloading').removeClass('is-hidden').delay(10)).done(function() {
    ipcRenderer.send("bwa:input.file");
  });

  return;
});


/*
  $('#bwaFileinputconfirmButtonCancel').click(function() {...});
    Bulk whois, file input, cancel button, file confirmation
 */
$('#bwaFileinputconfirmButtonCancel').click(function() {
  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwaFileinputconfirmButtonStart').click(function() {...});
    Bulk whois, file input, start button, file confirmation
 */
$('#bwaFileinputconfirmButtonStart').click(function() {
  ipcRenderer.send("bwa:analyser.start", bwaFileContents);
  /*
  $('#bwaFileinputconfirm').addClass('is-hidden');
  $.when($('#bwaProcess').removeClass('is-hidden').delay(10)).done(function() {
    showTable();
  });*/

  return;
});

/*
// File Input, proceed to bulk whois
$('#bwafButtonConfirm').click(function() {
  const bwDomainArray = bwFileContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim);
  const bwTldsArray = $('#bwfSearchTlds').val().toString().split(',');

  $('#bwFileInputConfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  ipcRenderer.send("bulkwhois:lookup", bwDomainArray, bwTldsArray);
});

// Bulk whois file input by drag and drop
(function() {
  const holder = document.getElementById('bwaMainContainer');
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
    for (const file of event.dataTransfer.files) {
      ipcRenderer.send('app:debug', `File(s) you dragged here: ${file.path}`);
      ipcRenderer.send('ondragstart', file.path);
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
