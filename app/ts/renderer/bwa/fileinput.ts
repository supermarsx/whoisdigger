import type { FileInfoResult } from '../../common/tauriBridge.js';
import { qs, on } from '../../utils/dom.js';
import { settings } from '../settings-renderer.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import {
  watch,
  csvParseFile,
  openCsvJsonDialog,
  bwaAnalyserStart,
  fileInfo,
  listen,
} from '../../common/tauriBridge.js';

const debug = debugFactory('renderer.bwa.fileinput');
const error = errorFactory('renderer.bwa.fileinput');
debug('loaded');

import { formatString } from '../../common/stringformat.js';
import { renderAnalyser } from './analyser.js';
import { FileWatcherManager } from '../../utils/fileWatcher.js';

let bwaFileContents: any;
const watcher = new FileWatcherManager(watch);

function renderBwaFileInfo(info: FileInfoResult, lineCount: number, preview: string, errors: string): void {
  qs('#bwaFileTdFilename')!.textContent = info.filename;
  qs('#bwaFileTdLastmodified')!.textContent = info.mtimeFormatted ?? '';
  qs('#bwaFileTdLastaccessed')!.textContent = info.atimeFormatted ?? '';
  qs('#bwaFileTdFilesize')!.textContent =
    info.humanSize + formatString(' ({0} record(s))', String(lineCount));
  qs('#bwaFileTdFilepreview')!.textContent = preview + '...';
  qs('#bwaFileTextareaErrors')!.textContent = errors || 'No errors';
}

async function refreshBwaFile(pathToFile: string): Promise<void> {
  try {
    const info = await fileInfo(pathToFile, { si: settings.lookupMisc.useStandardSize });
    bwaFileContents = await csvParseFile(pathToFile);
    const lineCount = bwaFileContents.data.length;
    let preview = '';
    try {
      preview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(0, 50);
    } catch { /* empty */ }
    const errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);
    renderBwaFileInfo(info, lineCount, preview, errors);
  } catch (e) {
    error(`Failed to reload file: ${e}`);
  }
}

/*
  File input, path and information confirmation container
 */
async function handleFileConfirmation(
  filePath: string | string[] | null = null,
  isDragDrop = false
) {
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

  qs('#bwaFileSpanInfo')!.textContent = 'Loading file info...';
  if (isDragDrop === true) {
    qs('#bwaEntry')!.classList.add('is-hidden');
    qs('#bwaFileinputloading')!.classList.remove('is-hidden');
  }

  const targetPath = Array.isArray(filePath) ? (filePath as string[])[0] : (filePath as string);

  let info: FileInfoResult;
  try {
    info = await fileInfo(targetPath, { si: settings.lookupMisc.useStandardSize });
    qs('#bwaFileSpanInfo')!.textContent = 'Loading file contents...';
    bwaFileContents = await csvParseFile(targetPath);
  } catch (e) {
    error(`Failed to read file: ${e}`);
    qs('#bwaFileSpanInfo')!.textContent = 'Failed to load file';
    return;
  }

  const lineCount = bwaFileContents.data.length;
  let preview = '';
  try {
    preview = JSON.stringify(bwaFileContents.data[0], null, '\t').substring(0, 50);
  } catch { /* empty */ }
  const errors = JSON.stringify(bwaFileContents.errors).slice(1, -1);

  qs('#bwaFileinputloading')!.classList.add('is-hidden');
  qs('#bwaFileinputconfirm')!.classList.remove('is-hidden');

  renderBwaFileInfo(info, lineCount, preview, errors);

  if (chosenPath) {
    await watcher.watch('bwa', chosenPath, { persistent: false }, (evt) => {
      if (evt.event === 'change') void refreshBwaFile(chosenPath);
    });
  }
}

void listen<{ filePath: string | string[] | null; isDragDrop?: boolean }>('bwa:fileinput.confirmation', ({ filePath, isDragDrop }) => {
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
    const filePath = await openCsvJsonDialog();
    void handleFileConfirmation(filePath);
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
    const data = await bwaAnalyserStart(bwaFileContents);
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

  void bulkWhoisLookup(bwDomainArray, bwTldsArray);
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
      void handleFileConfirmation((file as any).path, true);
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
