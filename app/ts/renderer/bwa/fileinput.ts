import * as conversions from '../../common/conversions.js';
import fs from 'fs';
import type { FileStats } from '../../common/fileStats.js';
import Papa from 'papaparse';
import datatables from 'datatables';
const dt = datatables();
import path from 'path';
import { settings } from '../../common/settings.js';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};
import $ from '../../../vendor/jquery.js';

import { formatString } from '../../common/stringformat.js';

let bwaFileContents: any;
let bwaFileWatcher: fs.FSWatcher | undefined;

async function refreshBwaFile(pathToFile: string): Promise<void> {
  try {
    const bwaFileStats = (await fs.promises.stat(pathToFile)) as FileStats;
    bwaFileStats.filename = path.basename(pathToFile);
    bwaFileStats.humansize = conversions.byteToHumanFileSize(
      bwaFileStats.size,
      settings.lookupMisc.useStandardSize
    );
    bwaFileContents = Papa.parse(
      (await fs.promises.readFile(pathToFile)).toString(),
      { header: true }
    );
    bwaFileStats.linecount = bwaFileContents.data.length;
    try {
      bwaFileStats.filepreview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(
        0,
        50
      );
    } catch {
      bwaFileStats.filepreview = '';
    }
    bwaFileStats.errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
    $('#bwaFileTdFilename').text(String(bwaFileStats.filename));
    $('#bwaFileTdLastmodified').text(conversions.getDate(bwaFileStats.mtime) ?? '');
    $('#bwaFileTdLastaccessed').text(conversions.getDate(bwaFileStats.atime) ?? '');
    $('#bwaFileTdFilesize').text(
      String(bwaFileStats.humansize) +
        formatString(' ({0} record(s))', String(bwaFileStats.linecount))
    );
    $('#bwaFileTdFilepreview').text(String(bwaFileStats.filepreview) + '...');
    $('#bwaFileTextareaErrors').text(String(bwaFileStats.errors || 'No errors'));
  } catch (e) {
    electron.send('app:error', `Failed to reload file: ${e}`);
  }
}

/*
  electron.on('bwa:fileinput.confirmation', function(...) {...});
    File input, path and information confirmation container
 */
electron.on(
  'bwa:fileinput.confirmation',
  async function (event, filePath: string | string[] | null = null, isDragDrop = false) {
    let bwaFileStats: FileStats; // File stats, size, last changed, etc

    if (bwaFileWatcher) {
      bwaFileWatcher.close();
      bwaFileWatcher = undefined;
    }

    const chosenPath = Array.isArray(filePath)
      ? filePath
        ? (filePath as string[])[0]
        : null
      : (filePath as string | null);

    $('#bwaFileSpanInfo').text('Waiting for file...');

    if (filePath === undefined || filePath == '' || filePath === null) {
      $('#bwaFileinputloading').addClass('is-hidden');
      $('#bwaEntry').removeClass('is-hidden');
    } else {
      $('#bwaFileSpanInfo').text('Loading file stats...');
      if (isDragDrop === true) {
        $('#bwaEntry').addClass('is-hidden');
        $('#bwaFileinputloading').removeClass('is-hidden');
        try {
          bwaFileStats = fs.statSync(filePath as string) as FileStats;
          bwaFileStats.filename = path.basename(filePath as string);
          bwaFileStats.humansize = conversions.byteToHumanFileSize(
            bwaFileStats.size,
            settings.lookupMisc.useStandardSize
          );
          $('#bwaFileSpanInfo').text('Loading file contents...');
          bwaFileContents = Papa.parse(
            (await fs.promises.readFile(filePath as string)).toString(),
            {
              header: true
            }
          );
        } catch (e) {
          electron.send('app:error', `Failed to read file: ${e}`);
          $('#bwaFileSpanInfo').text('Failed to load file');
          return;
        }
      } else {
        try {
          bwaFileStats = fs.statSync((filePath as string[])[0]) as FileStats;
          bwaFileStats.filename = path.basename((filePath as string[])[0]);
          bwaFileStats.humansize = conversions.byteToHumanFileSize(
            bwaFileStats.size,
            settings.lookupMisc.useStandardSize
          );
          $('#bwaFileSpanInfo').text('Loading file contents...');
          bwaFileContents = Papa.parse(
            (await fs.promises.readFile((filePath as string[])[0])).toString(),
            {
              header: true
            }
          );
        } catch (e) {
          electron.send('app:error', `Failed to read file: ${e}`);
          $('#bwaFileSpanInfo').text('Failed to load file');
          return;
        }
      }
      $('#bwaFileSpanInfo').text('Getting line count...');
      bwaFileStats.linecount = bwaFileContents.data.length;
      try {
        bwaFileStats.filepreview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(
          0,
          50
        );
      } catch (e) {
        bwaFileStats.filepreview = '';
      }
      bwaFileStats.errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
      $('#bwaFileinputloading').addClass('is-hidden');
      $('#bwaFileinputconfirm').removeClass('is-hidden');

      // stats
      $('#bwaFileTdFilename').text(String(bwaFileStats.filename));
      $('#bwaFileTdLastmodified').text(conversions.getDate(bwaFileStats.mtime) ?? '');
      $('#bwaFileTdLastaccessed').text(conversions.getDate(bwaFileStats.atime) ?? '');
      $('#bwaFileTdFilesize').text(
        String(bwaFileStats.humansize) +
          formatString(' ({0} record(s))', String(bwaFileStats.linecount))
      );
      $('#bwaFileTdFilepreview').text(String(bwaFileStats.filepreview) + '...');
      $('#bwaFileTextareaErrors').text(String(bwaFileStats.errors || 'No errors'));
      //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
      if (chosenPath) {
        bwaFileWatcher = fs.watch(chosenPath, { persistent: false }, (evt) => {
          if (evt === 'change') void refreshBwaFile(chosenPath);
        });
      }
    }

    return;
  }
);

/*
  $('#bwaEntryButtonOpen').click(function() {...});
    Bulk whois, file input, entry container button
 */
$(document).on('click', '#bwaEntryButtonOpen', function () {
  $('#bwaEntry').addClass('is-hidden');
  $.when($('#bwaFileinputloading').removeClass('is-hidden').delay(10)).done(function () {
    electron.send('bwa:input.file');
  });

  return;
});

/*
  $('#bwaFileinputconfirmButtonCancel').click(function() {...});
    Bulk whois, file input, cancel button, file confirmation
 */
$('#bwaFileinputconfirmButtonCancel').click(function () {
  if (bwaFileWatcher) {
    bwaFileWatcher.close();
    bwaFileWatcher = undefined;
  }
  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwaFileinputconfirmButtonStart').click(function() {...});
    Bulk whois, file input, start button, file confirmation
 */
$('#bwaFileinputconfirmButtonStart').click(function () {
  if (bwaFileWatcher) {
    bwaFileWatcher.close();
    bwaFileWatcher = undefined;
  }
  electron.send('bwa:analyser.start', bwaFileContents);
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

  electron.send('bulkwhois:lookup', bwDomainArray, bwTldsArray);
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
      electron.send('app:debug', `File(s) you dragged here: ${file.path}`);
      electron.send('ondragstart', file.path);
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
