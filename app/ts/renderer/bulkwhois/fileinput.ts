import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import type * as fs from 'fs';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';
const debug = debugFactory('bulkwhois.fileinput');
const error = errorFactory('bulkwhois.fileinput');
debug('loaded');

const electron = (window as any).electron as RendererElectronAPI & {
  bwFileRead: (p: string) => Promise<Buffer>;
  watch: (
    prefix: string,
    p: string,
    opts: fs.WatchOptions,
    cb: (evt: string) => void
  ) => Promise<{ close: () => void }>;
  stat: (p: string) => Promise<any>;
  path: { basename: (p: string) => Promise<string> };
};
import { tableReset } from './auxiliary.js';
import $ from '../../../vendor/jquery.js';

import { formatString } from '../../common/stringformat.js';
import { settings } from '../settings-renderer.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { FileWatcherManager } from '../../utils/fileWatcher.js';
import { getTimeEstimates } from './estimate.js';

let bwFileContents: Buffer;
const watcher = new FileWatcherManager(electron.watch);

async function refreshBwFile(pathToFile: string): Promise<void> {
  try {
    const misc = settings.lookupMisc;
    const lookup = {
      randomize: {
        timeBetween: settings.lookupRandomizeTimeBetween
      }
    };
    const bwFileStats = (await electron.stat(pathToFile)) as FileStats;
    bwFileStats.filename = await electron.path.basename(pathToFile);
    bwFileStats.humansize = conversions.byteToHumanFileSize(bwFileStats.size, misc.useStandardSize);
    bwFileContents = await electron.bwFileRead(pathToFile);
    bwFileStats.linecount = bwFileContents.toString().split('\n').length;

    const estimate = getTimeEstimates(bwFileStats.linecount!, settings);
    bwFileStats.minestimate = estimate.min;
    bwFileStats.maxestimate = estimate.max;

    if (estimate.max) {
      $('#bwFileSpanTimebetweenmin').text(
        formatString('{0}ms ', lookup.randomize.timeBetween.minimum)
      );
      $('#bwFileSpanTimebetweenmax').text(
        formatString('/ {0}ms', lookup.randomize.timeBetween.maximum)
      );
      $('#bwFileTdEstimate').text(
        formatString('{0} to {1}', bwFileStats.minestimate, bwFileStats.maxestimate)
      );
    } else {
      $('#bwFileSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwFileSpanTimebetweenmin').text(settings.lookupGeneral.timeBetween + 'ms');
      $('#bwFileTdEstimate').text(formatString('> {0}', bwFileStats.minestimate));
    }

    bwFileStats.filepreview = bwFileContents.toString().substring(0, 50);

    $('#bwFileTdName').text(String(bwFileStats.filename));
    $('#bwFileTdLastmodified').text(conversions.getDate(bwFileStats.mtime) ?? '');
    $('#bwFileTdLastaccess').text(conversions.getDate(bwFileStats.atime) ?? '');
    $('#bwFileTdFilesize').text(
      String(bwFileStats.humansize) + formatString(' ({0} line(s))', String(bwFileStats.linecount))
    );
    $('#bwFileTdFilepreview').text(String(bwFileStats.filepreview) + '...');
  } catch (e) {
    error(`Failed to reload file: ${e}`);
  }
}

async function handleFileConfirmation(
  filePath: string | string[] | null = null,
  isDragDrop = false
): Promise<void> {
  let bwFileStats: FileStats; // File stats, size, last changed, etc
  const misc = settings.lookupMisc;
  const lookup = {
    randomize: {
      timeBetween: settings.lookupRandomizeTimeBetween
    }
  };

  watcher.close();

  const chosenPath = Array.isArray(filePath)
    ? filePath
      ? (filePath as string[])[0]
      : null
    : (filePath as string | null);

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
      try {
        bwFileStats = (await electron.stat(filePath as string)) as FileStats;
        bwFileStats.filename = await electron.path.basename(filePath as string);
        bwFileStats.humansize = conversions.byteToHumanFileSize(
          bwFileStats.size,
          misc.useStandardSize
        );
        $('#bwFileSpanInfo').text('Loading file contents...');
        bwFileContents = await electron.bwFileRead(filePath as string);
      } catch (e) {
        error(`Failed to read file: ${e}`);
        $('#bwFileSpanInfo').text('Failed to load file');
        return;
      }
    } else {
      try {
        bwFileStats = (await electron.stat((filePath as string[])[0])) as FileStats;
        bwFileStats.filename = await electron.path.basename((filePath as string[])[0]);
        bwFileStats.humansize = conversions.byteToHumanFileSize(
          bwFileStats.size,
          misc.useStandardSize
        );
        $('#bwFileSpanInfo').text('Loading file contents...');
        bwFileContents = await electron.bwFileRead((filePath as string[])[0]);
      } catch (e) {
        error(`Failed to read file: ${e}`);
        $('#bwFileSpanInfo').text('Failed to load file');
        return;
      }
    }
    $('#bwFileSpanInfo').text('Getting line count...');
    bwFileStats.linecount = bwFileContents.toString().split('\n').length;

    const estimate = getTimeEstimates(bwFileStats.linecount!, settings);
    bwFileStats.minestimate = estimate.min;
    bwFileStats.maxestimate = estimate.max;

    if (estimate.max) {
      $('#bwFileSpanTimebetweenmin').text(
        formatString('{0}ms ', lookup.randomize.timeBetween.minimum)
      );
      $('#bwFileSpanTimebetweenmax').text(
        formatString('/ {0}ms', lookup.randomize.timeBetween.maximum)
      );
      $('#bwFileTdEstimate').text(
        formatString('{0} to {1}', bwFileStats.minestimate, bwFileStats.maxestimate)
      );
    } else {
      $('#bwFileSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwFileSpanTimebetweenmin').text(settings.lookupGeneral.timeBetween + 'ms');
      $('#bwFileTdEstimate').text(formatString('> {0}', bwFileStats.minestimate));
    }

    bwFileStats.filepreview = bwFileContents.toString().substring(0, 50);
    debug(bwFileStats.filepreview);
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwFileinputconfirm').removeClass('is-hidden');

    // stats
    $('#bwFileTdName').text(String(bwFileStats.filename));
    $('#bwFileTdLastmodified').text(conversions.getDate(bwFileStats.mtime) ?? '');
    $('#bwFileTdLastaccess').text(conversions.getDate(bwFileStats.atime) ?? '');
    $('#bwFileTdFilesize').text(
      String(bwFileStats.humansize) + formatString(' ({0} line(s))', String(bwFileStats.linecount))
    );
    $('#bwFileTdFilepreview').text(String(bwFileStats.filepreview) + '...');
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']); // show estimated bulk lookup time
    debug('cont:' + bwFileContents);

    debug(bwFileStats.linecount);

    if (chosenPath) {
      await watcher.watch('bw', chosenPath, { persistent: false }, (evt: string) => {
        if (evt === 'change') void refreshBwFile(chosenPath);
      });
    }
  }

  return;
}

/*
  electron.on('bulkwhois:fileinput.confirmation', function(...) {...});
    // File input, path and information confirmation container
  parameters
    event
    filePath
    isDragDrop
 */
electron.on(
  IpcChannel.BulkwhoisFileinputConfirmation,
  (_event: unknown, filePath: string | string[] | null = null, isDragDrop = false) => {
    void handleFileConfirmation(filePath, isDragDrop);
  }
);

/*
  $('#bwEntryButtonFile').click(function() {...});
    File Input, Entry container button
 */
$(document).on('click', '#bwEntryButtonFile', function () {
  $('#bwEntry').addClass('is-hidden');
  $.when($('#bwFileinputloading').removeClass('is-hidden').delay(10)).done(async function () {
    const filePath = await electron.invoke(IpcChannel.BulkwhoisInputFile);
    await handleFileConfirmation(filePath);
  });

  return;
});

/*
  $('#bwFileButtonCancel').click(function() {...});
    File Input, cancel file confirmation
 */
$(document).on('click', '#bwFileButtonCancel', function () {
  watcher.close();
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwFileButtonConfirm').click(function() {...});
    File Input, proceed to bulk whois
 */
$(document).on('click', '#bwFileButtonConfirm', function () {
  watcher.close();
  const bwDomainArray = bwFileContents
    .toString()
    .split('\n')
    .map(Function.prototype.call, String.prototype.trim);
  const bwTldsArray = (($('#bwFileInputTlds').val() as string) || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  debug(bwDomainArray);
  debug(bwTldsArray);

  void electron.invoke(IpcChannel.BulkwhoisLookup, bwDomainArray, bwTldsArray);
});

/*
  dragDropInitialization (self-executing)
    Bulk whois file input by drag and drop
 */
(function dragDropInitialization() {
  $(document).ready(() => {
    const holder = document.getElementById('bulkwhoisMainContainer') as HTMLElement | null;
    if (!holder) return;

    holder.ondragover = function () {
      return false;
    };

    holder.ondragleave = function () {
      return false;
    };

    holder.ondragend = function () {
      return false;
    };

    holder.ondrop = function (event) {
      event.preventDefault();
      for (const f of Array.from(event.dataTransfer!.files)) {
        const file = f as any;
        debug(`File(s) you dragged here: ${file.path}`);
        electron.send('ondragstart', file.path);
      }
      return false;
    };
  });
})();

/*
  $('#bulkwhoisMainContainer').on('drop', function(...) {...});
    On Drop ipsum
 */
$('#bulkwhoisMainContainer').on('drop', function (event) {
  event.preventDefault();
  for (const f of Array.from((event as any).originalEvent.dataTransfer.files)) {
    const file = f as any;
    debug(`File(s) you dragged here: ${file.path}`);
    electron.send('ondragstart', file.path);
  }

  return false;
});

/*
  $('#bwFileInputTlds').keyup(function(...) {...});
    ipsum
 */
$('#bwFileInputTlds').keyup(function (event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwFileButtonConfirm').click();
  }

  return;
});
