import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import $ from '../../../vendor/jquery.js';
import '../../../vendor/datatables.js';
import { settings } from '../settings-renderer.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import type * as fs from 'fs';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  bwaFileRead: (p: string) => Promise<any>;
  watch: (
    prefix: string,
    p: string,
    opts: fs.WatchOptions,
    cb: (evt: string) => void
  ) => Promise<{ close: () => void }>;
  stat: (p: string) => Promise<any>;
  path: { basename: (p: string) => Promise<string> };
};

const debug = debugFactory('renderer.bwa.fileinput');
const error = errorFactory('renderer.bwa.fileinput');
debug('loaded');

import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { renderAnalyser } from './analyser.js';
import { FileWatcherManager } from '../../utils/fileWatcher.js';

let bwaFileContents: any;
const watcher = new FileWatcherManager(electron.watch);

async function loadFileStats(path: string, _isDragDrop: boolean): Promise<FileStats> {
  const stats = (await electron.stat(path)) as FileStats;
  stats.filename = await electron.path.basename(path);
  stats.humansize = conversions.byteToHumanFileSize(stats.size, settings.lookupMisc.useStandardSize);
  return stats;
}

async function readFileContents(path: string): Promise<any> {
  return electron.invoke(IpcChannel.ParseCsv, (await electron.bwaFileRead(path)).toString());
}

function updateFileInfoUI(stats: FileStats): void {
  $('#bwaFileTdFilename').text(String(stats.filename));
  $('#bwaFileTdLastmodified').text(conversions.getDate(stats.mtime) ?? '');
  $('#bwaFileTdLastaccessed').text(conversions.getDate(stats.atime) ?? '');
  $('#bwaFileTdFilesize').text(
    String(stats.humansize) + formatString(' ({0} record(s))', String(stats.linecount))
  );
  $('#bwaFileTdFilepreview').text(String(stats.filepreview) + '...');
  $('#bwaFileTextareaErrors').text(String(stats.errors || 'No errors'));
}

async function refreshBwaFile(pathToFile: string): Promise<void> {
  try {
    const bwaFileStats = (await electron.stat(pathToFile)) as FileStats;
    bwaFileStats.filename = await electron.path.basename(pathToFile);
    bwaFileStats.humansize = conversions.byteToHumanFileSize(
      bwaFileStats.size,
      settings.lookupMisc.useStandardSize
    );
    bwaFileContents = await electron.invoke(
      IpcChannel.ParseCsv,
      (await electron.bwaFileRead(pathToFile)).toString()
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
    error(`Failed to reload file: ${e}`);
  }
}

/*
  electron.on('bwa:fileinput.confirmation', function(...) {...});
    File input, path and information confirmation container
 */
async function handleFileConfirmation(
  filePath: string | string[] | null = null,
  isDragDrop = false
) {
  let bwaFileStats: FileStats;

  watcher.close();

  const chosenPath = Array.isArray(filePath)
    ? filePath
      ? (filePath as string[])[0]
      : null
    : (filePath as string | null);

  $('#bwaFileSpanInfo').text('Waiting for file...');

  if (filePath === undefined || filePath == '' || filePath === null) {
    $('#bwaFileinputloading').addClass('is-hidden');
    $('#bwaEntry').removeClass('is-hidden');
    return;
  }

  $('#bwaFileSpanInfo').text('Loading file stats...');
  if (isDragDrop === true) {
    $('#bwaEntry').addClass('is-hidden');
    $('#bwaFileinputloading').removeClass('is-hidden');
  }

  try {
    const targetPath = Array.isArray(filePath) ? (filePath as string[])[0] : (filePath as string);
    bwaFileStats = await loadFileStats(targetPath, isDragDrop);
    $('#bwaFileSpanInfo').text('Loading file contents...');
    bwaFileContents = await readFileContents(targetPath);
  } catch (e) {
    error(`Failed to read file: ${e}`);
    $('#bwaFileSpanInfo').text('Failed to load file');
    return;
  }

  $('#bwaFileSpanInfo').text('Getting line count...');
  bwaFileStats.linecount = bwaFileContents.data.length;
  try {
    bwaFileStats.filepreview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(0, 50);
  } catch {
    bwaFileStats.filepreview = '';
  }
  bwaFileStats.errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
  $('#bwaFileinputloading').addClass('is-hidden');
  $('#bwaFileinputconfirm').removeClass('is-hidden');

  updateFileInfoUI(bwaFileStats);

  if (chosenPath) {
    await watcher.watch('bwa', chosenPath, { persistent: false }, (evt: string) => {
      if (evt === 'change') void refreshBwaFile(chosenPath);
    });
  }

  return;
}

electron.on('bwa:fileinput.confirmation', (_e, filePath, isDragDrop) => {
  void handleFileConfirmation(filePath, isDragDrop);
});

/*
  $('#bwaEntryButtonOpen').click(function() {...});
    Bulk whois, file input, entry container button
 */
$(document).on('click', '#bwaEntryButtonOpen', function () {
  $('#bwaEntry').addClass('is-hidden');
  $.when($('#bwaFileinputloading').removeClass('is-hidden').delay(10)).done(function () {
    void (async () => {
      const path = await electron.invoke(IpcChannel.BwaInputFile);
      void handleFileConfirmation(path);
    })();
  });

  return;
});

/*
  $('#bwaFileinputconfirmButtonCancel').click(function() {...});
    Bulk whois, file input, cancel button, file confirmation
 */
$('#bwaFileinputconfirmButtonCancel').click(function () {
  watcher.close();
  $('#bwaFileinputconfirm').addClass('is-hidden');
  $('#bwaEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwaFileinputconfirmButtonStart').click(function() {...});
    Bulk whois, file input, start button, file confirmation
 */
$('#bwaFileinputconfirmButtonStart').click(function () {
  watcher.close();
  void (async () => {
    const data = await electron.invoke(IpcChannel.BwaAnalyserStart, bwaFileContents);
    renderAnalyser(data);
  })();
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

  electron.send(IpcChannel.BulkwhoisLookup, bwDomainArray, bwTldsArray);
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
      debug(`File(s) you dragged here: ${file.path}`);
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
