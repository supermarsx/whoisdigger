import * as conversions from '../../common/conversions';
import fs from 'fs';
import path from 'path';
import type { FileStats } from '../../common/fileStats';
import debugModule from 'debug';
const debug = debugModule('renderer.bw.fileinput');

import { ipcRenderer } from 'electron';
import { tableReset } from './auxiliary';
import $ from 'jquery';

import { formatString } from '../../common/stringformat';
import { settings } from '../../common/settings';

let bwFileContents: Buffer;
let bwFileWatcher: fs.FSWatcher | undefined;

async function refreshBwFile(pathToFile: string): Promise<void> {
  try {
    const misc = settings.lookupMisc;
    const lookup = {
      randomize: {
        timeBetween: settings.lookupRandomizeTimeBetween
      }
    };
    const bwFileStats = (await fs.promises.stat(pathToFile)) as FileStats;
    bwFileStats.filename = path.basename(pathToFile);
    bwFileStats.humansize = conversions.byteToHumanFileSize(bwFileStats.size, misc.useStandardSize);
    bwFileContents = await fs.promises.readFile(pathToFile);
    bwFileStats.linecount = bwFileContents.toString().split('\n').length;

    if (lookup.randomize.timeBetween.randomize === true) {
      bwFileStats.minestimate = conversions.msToHumanTime(
        bwFileStats.linecount! * lookup.randomize.timeBetween.minimum
      );
      bwFileStats.maxestimate = conversions.msToHumanTime(
        bwFileStats.linecount! * lookup.randomize.timeBetween.maximum
      );

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
      bwFileStats.minestimate = conversions.msToHumanTime(
        bwFileStats.linecount! * settings.lookupGeneral.timeBetween
      );
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
    ipcRenderer.send('app:error', `Failed to reload file: ${e}`);
  }
}

/*
  ipcRenderer.on('bw:fileinput.confirmation', function(...) {...});
    // File input, path and information confirmation container
  parameters
    event
    filePath
    isDragDrop
 */
ipcRenderer.on(
  'bw:fileinput.confirmation',
  async function (event, filePath: string | string[] | null = null, isDragDrop = false) {
    let bwFileStats: FileStats; // File stats, size, last changed, etc
    const misc = settings.lookupMisc;
    const lookup = {
      randomize: {
        timeBetween: settings.lookupRandomizeTimeBetween
      }
    };

    if (bwFileWatcher) {
      bwFileWatcher.close();
      bwFileWatcher = undefined;
    }

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
          bwFileStats = (await fs.promises.stat(filePath as string)) as FileStats;
          bwFileStats.filename = path.basename(filePath as string);
          bwFileStats.humansize = conversions.byteToHumanFileSize(
            bwFileStats.size,
            misc.useStandardSize
          );
          $('#bwFileSpanInfo').text('Loading file contents...');
          bwFileContents = await fs.promises.readFile(filePath as string);
        } catch (e) {
          ipcRenderer.send('app:error', `Failed to read file: ${e}`);
          $('#bwFileSpanInfo').text('Failed to load file');
          return;
        }
      } else {
        try {
          bwFileStats = (await fs.promises.stat((filePath as string[])[0])) as FileStats;
          bwFileStats.filename = path.basename((filePath as string[])[0]);
          bwFileStats.humansize = conversions.byteToHumanFileSize(
            bwFileStats.size,
            misc.useStandardSize
          );
          $('#bwFileSpanInfo').text('Loading file contents...');
          bwFileContents = await fs.promises.readFile((filePath as string[])[0]);
        } catch (e) {
          ipcRenderer.send('app:error', `Failed to read file: ${e}`);
          $('#bwFileSpanInfo').text('Failed to load file');
          return;
        }
      }
      $('#bwFileSpanInfo').text('Getting line count...');
      bwFileStats.linecount = bwFileContents.toString().split('\n').length;

      if (lookup.randomize.timeBetween.randomize === true) {
        bwFileStats.minestimate = conversions.msToHumanTime(
          bwFileStats.linecount! * lookup.randomize.timeBetween.minimum
        );
        bwFileStats.maxestimate = conversions.msToHumanTime(
          bwFileStats.linecount! * lookup.randomize.timeBetween.maximum
        );

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
        bwFileStats.minestimate = conversions.msToHumanTime(
          bwFileStats.linecount! * settings.lookupGeneral.timeBetween
        );
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
        String(bwFileStats.humansize) +
          formatString(' ({0} line(s))', String(bwFileStats.linecount))
      );
      $('#bwFileTdFilepreview').text(String(bwFileStats.filepreview) + '...');
      //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']);
      debug('cont:' + bwFileContents);

      debug(bwFileStats.linecount);

      if (chosenPath) {
        bwFileWatcher = fs.watch(chosenPath, { persistent: false }, (evt) => {
          if (evt === 'change') void refreshBwFile(chosenPath);
        });
      }
    }

    return;
  }
);

/*
  $('#bwEntryButtonFile').click(function() {...});
    File Input, Entry container button
 */
$(document).on('click', '#bwEntryButtonFile', function () {
  $('#bwEntry').addClass('is-hidden');
  $.when($('#bwFileinputloading').removeClass('is-hidden').delay(10)).done(function () {
    ipcRenderer.send('bw:input.file');
  });

  return;
});

/*
  $('#bwFileButtonCancel').click(function() {...});
    File Input, cancel file confirmation
 */
$(document).on('click', '#bwFileButtonCancel', function () {
  if (bwFileWatcher) {
    bwFileWatcher.close();
    bwFileWatcher = undefined;
  }
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwFileButtonConfirm').click(function() {...});
    File Input, proceed to bulk whois
 */
$(document).on('click', '#bwFileButtonConfirm', function () {
  if (bwFileWatcher) {
    bwFileWatcher.close();
    bwFileWatcher = undefined;
  }
  const bwDomainArray = bwFileContents
    .toString()
    .split('\n')
    .map(Function.prototype.call, String.prototype.trim);
  const bwTldsArray = (
    ($('#bwFileInputTlds').val() as string | number | string[] | undefined) || ''
  )
    .toString()
    .split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwFileinputconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  debug(bwDomainArray);
  debug(bwTldsArray);

  ipcRenderer.send('bw:lookup', bwDomainArray, bwTldsArray);
});

/*
  dragDropInitialization (self-executing)
    Bulk whois file input by drag and drop
 */
(function dragDropInitialization() {
  $(document).ready(() => {
    const holder = document.getElementById('bwMainContainer') as HTMLElement | null;
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
        ipcRenderer.send('app:debug', `File(s) you dragged here: ${file.path}`);
        ipcRenderer.send('ondragstart', file.path);
      }
      return false;
    };
  });
})();

/*
  $('#bwMainContainer').on('drop', function(...) {...});
    On Drop ipsum
 */
$('#bwMainContainer').on('drop', function (event) {
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
