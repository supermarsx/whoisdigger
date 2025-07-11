import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.fileinput');
const error = errorFactory('bulkwhois.fileinput');
debug('loaded');

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
  bwFileRead: (p: string) => Promise<Buffer>;
  watch: (
    prefix: string,
    p: string,
    opts: any,
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
import { readFileData, addEstimates } from './fileHandlers.js';
import { renderStats, renderEstimates, initDragAndDrop } from './ui.js';

let bwFileContents: Buffer;
const watcher = new FileWatcherManager(electron.watch);

async function refreshBwFile(pathToFile: string): Promise<void> {
  try {
    const { stats, contents } = await readFileData(electron, pathToFile);
    bwFileContents = contents;
    addEstimates(stats);
    renderEstimates(String(stats.minestimate!), stats.maxestimate);
    renderStats(stats);
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
    addEstimates(bwFileStats);
    bwFileStats.filepreview = bwFileContents.toString().substring(0, 50);
    $('#bwFileinputloading').addClass('is-hidden');
    $('#bwFileinputconfirm').removeClass('is-hidden');
    renderEstimates(String(bwFileStats.minestimate!), bwFileStats.maxestimate);
    renderStats(bwFileStats);
    debug('cont:' + bwFileContents);

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
  (_event, filePath: string | string[] | null = null, isDragDrop = false) => {
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

initDragAndDrop(electron);

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
