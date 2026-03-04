import type { FileInfoResult } from '../../common/tauriBridge.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import {
  fs,
  path,
  watch,
  openTextFileDialog,
  bulkWhoisLookup,
  fileInfo,
  listen,
} from '../../common/tauriBridge.js';
const debug = debugFactory('bulkwhois.fileinput');
const error = errorFactory('bulkwhois.fileinput');
debug('loaded');

import { tableReset } from './auxiliary.js';
import { qs, on } from '../../utils/dom.js';

import { formatString } from '../../common/stringformat.js';
import { settings } from '../settings-renderer.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { FileWatcherManager } from '../../utils/fileWatcher.js';

let bwFileContents: Buffer;
const watcher = new FileWatcherManager(watch);

function getTimingOptions() {
  return {
    si: settings.lookupMisc.useStandardSize,
    timeBetween: settings.lookupGeneral.timeBetween,
    timeBetweenMin: settings.lookupRandomizeTimeBetween.minimum,
    timeBetweenMax: settings.lookupRandomizeTimeBetween.maximum,
    randomize: settings.lookupRandomizeTimeBetween.randomize,
  };
}

function renderFileInfo(info: FileInfoResult): void {
  qs('#bwFileTdName')!.textContent = info.filename;
  qs('#bwFileTdLastmodified')!.textContent = info.mtimeFormatted ?? '';
  qs('#bwFileTdLastaccess')!.textContent = info.atimeFormatted ?? '';
  qs('#bwFileTdFilesize')!.textContent =
    info.humanSize + formatString(' ({0} line(s))', String(info.lineCount));
  qs('#bwFileTdFilepreview')!.textContent = info.filePreview + '...';

  if (info.maxEstimate) {
    qs('#bwFileSpanTimebetweenmin')!.textContent = formatString(
      '{0}ms ',
      settings.lookupRandomizeTimeBetween.minimum
    );
    qs('#bwFileSpanTimebetweenmax')!.textContent = formatString(
      '/ {0}ms',
      settings.lookupRandomizeTimeBetween.maximum
    );
    qs('#bwFileTdEstimate')!.textContent = formatString(
      '{0} to {1}',
      info.minEstimate,
      info.maxEstimate
    );
  } else {
    qs('#bwFileSpanTimebetweenminmax')!.classList.add('is-hidden');
    qs('#bwFileSpanTimebetweenmin')!.textContent = settings.lookupGeneral.timeBetween + 'ms';
    qs('#bwFileTdEstimate')!.textContent = formatString('> {0}', info.minEstimate);
  }
}

async function refreshBwFile(pathToFile: string): Promise<void> {
  try {
    const info = await fileInfo(pathToFile, getTimingOptions());
    renderFileInfo(info);
  } catch (e) {
    error(`Failed to reload file: ${e}`);
  }
}

async function handleFileConfirmation(
  filePath: string | string[] | null = null,
  isDragDrop = false
): Promise<void> {
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
    qs('#bwLoadingInfo')!.textContent = 'Loading file info...';
    if (isDragDrop === true) {
      qs('#bwEntry')!.classList.add('is-hidden');
      qs('#bwFileinputloading')!.classList.remove('is-hidden');
    }

    const targetPath = Array.isArray(filePath) ? (filePath as string[])[0] : (filePath as string);

    let info: FileInfoResult;
    try {
      info = await fileInfo(targetPath, getTimingOptions());
    } catch (e) {
      error(`Failed to read file: ${e}`);
      qs('#bwFileSpanInfo')!.textContent = 'Failed to load file';
      return;
    }

    // Keep local copy of file content for later split into domain array
    try {
      bwFileContents = await fs.readFile(targetPath) as unknown as Buffer;
    } catch (e) {
      error(`Failed to read file contents: ${e}`);
      return;
    }

    qs('#bwFileinputloading')!.classList.add('is-hidden');
    qs('#bwFileinputconfirm')!.classList.remove('is-hidden');

    renderFileInfo(info);
    debug(info.filePreview);
    debug(info.lineCount);

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
void listen<{ filePath: string | string[] | null; isDragDrop?: boolean }>(
  IpcChannel.BulkwhoisFileinputConfirmation,
  ({ filePath, isDragDrop }) => {
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
    const filePath = await openTextFileDialog();
    await handleFileConfirmation(filePath as string | string[] | null);
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

  void bulkWhoisLookup(bwDomainArray, bwTldsArray);
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
      void handleFileConfirmation(file.path, true);
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
    void handleFileConfirmation(file.path, true);
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
