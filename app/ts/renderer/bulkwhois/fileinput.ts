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
    cb: (evt: { event: string; filename: string | null }) => void
  ) => Promise<{ close: () => void }>;
  stat: (p: string) => Promise<any>;
  path: { basename: (p: string) => Promise<string> };
};
import { tableReset } from './auxiliary.js';
import { qs, on } from '../../utils/dom.js';

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
      qs('#bwFileSpanTimebetweenmin')!.textContent = formatString(
        '{0}ms ',
        lookup.randomize.timeBetween.minimum
      );
      qs('#bwFileSpanTimebetweenmax')!.textContent = formatString(
        '/ {0}ms',
        lookup.randomize.timeBetween.maximum
      );
      qs('#bwFileTdEstimate')!.textContent = formatString(
        '{0} to {1}',
        bwFileStats.minestimate,
        bwFileStats.maxestimate
      );
    } else {
      qs('#bwFileSpanTimebetweenminmax')!.classList.add('is-hidden');
      qs('#bwFileSpanTimebetweenmin')!.textContent = settings.lookupGeneral.timeBetween + 'ms';
      qs('#bwFileTdEstimate')!.textContent = formatString('> {0}', bwFileStats.minestimate);
    }

    bwFileStats.filepreview = bwFileContents.toString().substring(0, 50);

    qs('#bwFileTdName')!.textContent = String(bwFileStats.filename);
    qs('#bwFileTdLastmodified')!.textContent = conversions.getDate(bwFileStats.mtime) ?? '';
    qs('#bwFileTdLastaccess')!.textContent = conversions.getDate(bwFileStats.atime) ?? '';
    qs('#bwFileTdFilesize')!.textContent =
      String(bwFileStats.humansize) + formatString(' ({0} line(s))', String(bwFileStats.linecount));
    qs('#bwFileTdFilepreview')!.textContent = String(bwFileStats.filepreview) + '...';
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
    qs('#bwFileinputloading')!.classList.add('is-hidden');
    qs('#bwEntry')!.classList.remove('is-hidden');
  } else {
    qs('#bwLoadingInfo')!.textContent = 'Loading file stats...';
    if (isDragDrop === true) {
      qs('#bwEntry')!.classList.add('is-hidden');
      qs('#bwFileinputloading')!.classList.remove('is-hidden');
      try {
        bwFileStats = (await electron.stat(filePath as string)) as FileStats;
        bwFileStats.filename = await electron.path.basename(filePath as string);
        bwFileStats.humansize = conversions.byteToHumanFileSize(
          bwFileStats.size,
          misc.useStandardSize
        );
        qs('#bwFileSpanInfo')!.textContent = 'Loading file contents...';
        bwFileContents = await electron.bwFileRead(filePath as string);
      } catch (e) {
        error(`Failed to read file: ${e}`);
        qs('#bwFileSpanInfo')!.textContent = 'Failed to load file';
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
        qs('#bwFileSpanInfo')!.textContent = 'Loading file contents...';
        bwFileContents = await electron.bwFileRead((filePath as string[])[0]);
      } catch (e) {
        error(`Failed to read file: ${e}`);
        qs('#bwFileSpanInfo')!.textContent = 'Failed to load file';
        return;
      }
    }
    qs('#bwFileSpanInfo')!.textContent = 'Getting line count...';
    bwFileStats.linecount = bwFileContents.toString().split('\n').length;

    const estimate = getTimeEstimates(bwFileStats.linecount!, settings);
    bwFileStats.minestimate = estimate.min;
    bwFileStats.maxestimate = estimate.max;

    if (estimate.max) {
      qs('#bwFileSpanTimebetweenmin')!.textContent = formatString(
        '{0}ms ',
        lookup.randomize.timeBetween.minimum
      );
      qs('#bwFileSpanTimebetweenmax')!.textContent = formatString(
        '/ {0}ms',
        lookup.randomize.timeBetween.maximum
      );
      qs('#bwFileTdEstimate')!.textContent = formatString(
        '{0} to {1}',
        bwFileStats.minestimate,
        bwFileStats.maxestimate
      );
    } else {
      qs('#bwFileSpanTimebetweenminmax')!.classList.add('is-hidden');
      qs('#bwFileSpanTimebetweenmin')!.textContent = settings.lookupGeneral.timeBetween + 'ms';
      qs('#bwFileTdEstimate')!.textContent = formatString('> {0}', bwFileStats.minestimate);
    }

    bwFileStats.filepreview = bwFileContents.toString().substring(0, 50);
    debug(bwFileStats.filepreview);
    qs('#bwFileinputloading')!.classList.add('is-hidden');
    qs('#bwFileinputconfirm')!.classList.remove('is-hidden');

    // stats
    qs('#bwFileTdName')!.textContent = String(bwFileStats.filename);
    qs('#bwFileTdLastmodified')!.textContent = conversions.getDate(bwFileStats.mtime) ?? '';
    qs('#bwFileTdLastaccess')!.textContent = conversions.getDate(bwFileStats.atime) ?? '';
    qs('#bwFileTdFilesize')!.textContent =
      String(bwFileStats.humansize) + formatString(' ({0} line(s))', String(bwFileStats.linecount));
    qs('#bwFileTdFilepreview')!.textContent = String(bwFileStats.filepreview) + '...';
    //$('#bwTableMaxEstimate').text(bwFileStats['maxestimate']); // show estimated bulk lookup time
    debug('cont:' + bwFileContents);

    debug(bwFileStats.linecount);

    if (chosenPath) {
      await watcher.watch('bw', chosenPath, { persistent: false }, (evt) => {
        if (evt.event === 'change') void refreshBwFile(chosenPath);
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
void on('click', '#bwEntryButtonFile', () => {
  qs('#bwEntry')!.classList.add('is-hidden');
  const loader = qs('#bwFileinputloading')!;
  loader.classList.remove('is-hidden');
  setTimeout(async () => {
    const filePath = await electron.invoke(IpcChannel.BulkwhoisInputFile);
    await handleFileConfirmation(filePath);
  }, 10);
});

/*
  $('#bwFileButtonCancel').click(function() {...});
    File Input, cancel file confirmation
 */
void on('click', '#bwFileButtonCancel', () => {
  watcher.close();
  qs('#bwFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwEntry')!.classList.remove('is-hidden');
});

/*
  $('#bwFileButtonConfirm').click(function() {...});
    File Input, proceed to bulk whois
 */
void on('click', '#bwFileButtonConfirm', () => {
  watcher.close();
  const bwDomainArray = bwFileContents
    .toString()
    .split('\n')
    .map(Function.prototype.call, String.prototype.trim);
  const input = qs<HTMLInputElement>('#bwFileInputTlds');
  const bwTldsArray = (input?.value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  tableReset(bwDomainArray.length, bwTldsArray.length);
  qs('#bwFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwProcessing')!.classList.remove('is-hidden');

  debug(bwDomainArray);
  debug(bwTldsArray);

  void electron.invoke(IpcChannel.BulkwhoisLookup, bwDomainArray, bwTldsArray);
});

/*
  dragDropInitialization (self-executing)
    Bulk whois file input by drag and drop
 */
document.addEventListener('DOMContentLoaded', () => {
  const holder = document.getElementById('bulkwhoisMainContainer') as HTMLElement | null;
  if (!holder) return;

  holder.ondragover = () => false;
  holder.ondragleave = () => false;
  holder.ondragend = () => false;
  holder.ondrop = (event) => {
    event.preventDefault();
    for (const f of Array.from(event.dataTransfer!.files)) {
      const file = f as any;
      debug(`File(s) you dragged here: ${file.path}`);
      electron.send('ondragstart', file.path);
    }
    return false;
  };
});

/*
  $('#bulkwhoisMainContainer').on('drop', function(...) {...});
    On Drop ipsum
 */
void on('drop', '#bulkwhoisMainContainer', (event: DragEvent) => {
  event.preventDefault();
  for (const f of Array.from(event.dataTransfer!.files)) {
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
qs('#bwFileInputTlds')?.addEventListener('keyup', (event: KeyboardEvent) => {
  event.preventDefault();
  if (event.key === 'Enter' || event.keyCode === 13) {
    qs('#bwFileButtonConfirm')?.dispatchEvent(new Event('click', { bubbles: true }));
  }
});
