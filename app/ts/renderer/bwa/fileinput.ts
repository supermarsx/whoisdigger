import * as conversions from '../../common/conversions.js';
import type { FileStats } from '../../common/fileStats.js';
import { qs, on } from '../../utils/dom.js';
import { settings } from '../settings-renderer.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import type * as fs from 'fs';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI & {
  bwaFileRead: (p: string) => Promise<any>;
  watch: (
    prefix: string,
    p: string,
    opts: fs.WatchOptions,
    cb: (evt: { event: string; filename: string | null }) => void
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
  qs('#bwaFileTdFilename')!.textContent = String(stats.filename);
  qs('#bwaFileTdLastmodified')!.textContent = conversions.getDate(stats.mtime) ?? '';
  qs('#bwaFileTdLastaccessed')!.textContent = conversions.getDate(stats.atime) ?? '';
  qs('#bwaFileTdFilesize')!.textContent =
    String(stats.humansize) + formatString(' ({0} record(s))', String(stats.linecount));
  qs('#bwaFileTdFilepreview')!.textContent = String(stats.filepreview) + '...';
  qs('#bwaFileTextareaErrors')!.textContent = String(stats.errors || 'No errors');
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
    qs('#bwaFileTdFilename')!.textContent = String(bwaFileStats.filename);
    qs('#bwaFileTdLastmodified')!.textContent =
      conversions.getDate(bwaFileStats.mtime) ?? '';
    qs('#bwaFileTdLastaccessed')!.textContent =
      conversions.getDate(bwaFileStats.atime) ?? '';
    qs('#bwaFileTdFilesize')!.textContent =
      String(bwaFileStats.humansize) +
      formatString(' ({0} record(s))', String(bwaFileStats.linecount));
    qs('#bwaFileTdFilepreview')!.textContent = String(bwaFileStats.filepreview) + '...';
    qs('#bwaFileTextareaErrors')!.textContent = String(bwaFileStats.errors || 'No errors');
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

  qs('#bwaFileSpanInfo')!.textContent = 'Waiting for file...';

  if (filePath === undefined || filePath == '' || filePath === null) {
    qs('#bwaFileinputloading')!.classList.add('is-hidden');
    qs('#bwaEntry')!.classList.remove('is-hidden');
    return;
  }

  qs('#bwaFileSpanInfo')!.textContent = 'Loading file stats...';
  if (isDragDrop === true) {
    qs('#bwaEntry')!.classList.add('is-hidden');
    qs('#bwaFileinputloading')!.classList.remove('is-hidden');
  }

  try {
    const targetPath = Array.isArray(filePath) ? (filePath as string[])[0] : (filePath as string);
    bwaFileStats = await loadFileStats(targetPath, isDragDrop);
    qs('#bwaFileSpanInfo')!.textContent = 'Loading file contents...';
    bwaFileContents = await readFileContents(targetPath);
  } catch (e) {
    error(`Failed to read file: ${e}`);
    qs('#bwaFileSpanInfo')!.textContent = 'Failed to load file';
    return;
  }

  qs('#bwaFileSpanInfo')!.textContent = 'Getting line count...';
  bwaFileStats.linecount = bwaFileContents.data.length;
  try {
    bwaFileStats.filepreview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(0, 50);
  } catch {
    bwaFileStats.filepreview = '';
  }
  bwaFileStats.errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
  qs('#bwaFileinputloading')!.classList.add('is-hidden');
  qs('#bwaFileinputconfirm')!.classList.remove('is-hidden');

  updateFileInfoUI(bwaFileStats);

  if (chosenPath) {
    await watcher.watch('bwa', chosenPath, { persistent: false }, (evt) => {
      if (evt.event === 'change') void refreshBwaFile(chosenPath);
    });
  }

  return;
}

electron.on('bwa:fileinput.confirmation', (_e: unknown, filePath: string | string[] | null, isDragDrop?: boolean) => {
  void handleFileConfirmation(filePath, isDragDrop);
});

/*
  $('#bwaEntryButtonOpen').click(function() {...});
    Bulk whois, file input, entry container button
 */
void on('click', '#bwaEntryButtonOpen', () => {
  qs('#bwaEntry')!.classList.add('is-hidden');
  const loader = qs('#bwaFileinputloading')!;
  loader.classList.remove('is-hidden');
  setTimeout(async () => {
    const path = await electron.invoke(IpcChannel.BwaInputFile);
    void handleFileConfirmation(path);
  }, 10);
});

/*
  $('#bwaFileinputconfirmButtonCancel').click(function() {...});
    Bulk whois, file input, cancel button, file confirmation
 */
void on('click', '#bwaFileinputconfirmButtonCancel', () => {
  watcher.close();
  qs('#bwaFileinputconfirm')!.classList.add('is-hidden');
  qs('#bwaEntry')!.classList.remove('is-hidden');
});

/*
  $('#bwaFileinputconfirmButtonStart').click(function() {...});
    Bulk whois, file input, start button, file confirmation
 */
void on('click', '#bwaFileinputconfirmButtonStart', () => {
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

});

/*
// File Input, proceed to bulk whois
void on('click', '#bwafButtonConfirm', () => {
  const bwDomainArray = bwaFileContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim);
  const bwTldsArray = (qs<HTMLInputElement>('#bwfSearchTlds')?.value || '').split(',');

  qs('#bwFileInputConfirm')!.classList.add('is-hidden');
  qs('#bwProcessing')!.classList.remove('is-hidden');

  electron.send(IpcChannel.BulkwhoisLookup, bwDomainArray, bwTldsArray);
});

// Bulk whois file input by drag and drop
(() => {
  const holder = document.getElementById('bwaMainContainer');
  if (!holder) return;
  holder.ondragover = () => false;
  holder.ondragleave = () => false;
  holder.ondragend = () => false;
  holder.ondrop = (event) => {
    event.preventDefault();
    for (const file of Array.from(event.dataTransfer!.files)) {
      debug(`File(s) you dragged here: ${file.path}`);
      electron.send('ondragstart', (file as any).path);
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
