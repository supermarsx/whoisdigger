import { dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { debugFactory } from '../../common/logger.js';
const debug = debugFactory('bulkwhois.export');
import { formatString } from '../../common/stringformat.js';

import { getSettings } from '../settings-main.js';
import { generateFilename } from '../../cli/export.js';
import { IpcChannel } from '../../common/ipcChannels.js';
import { handle } from '../ipc.js';
import {
  buildExportIndices,
  generateContent,
  writeZipArchive,
  type ExportOptions,
  type ExportSettings
} from './export-helpers.js';

/*
  ipcMain.on('bulkwhois:export', function(...) {...});
    On event: bulk whois export event
  parameters
    event (object) - renderer object
    results (object) - bulk whois results object
    options (object) - bulk whois export options object
 */
handle(IpcChannel.BulkwhoisExport, async function (event, results, options) {
  const { lookupExport: resExports } = getSettings();
  const sender = event.sender;

  let filters;
  switch (options.filetype) {
    case 'txt':
      filters = [
        { name: 'All files', extensions: ['*'] },
        { name: 'Plain text files', extensions: ['txt'] }
      ];
      break;
    case 'csv':
      filters = [
        { name: 'All files', extensions: ['*'] },
        { name: 'Comma-separated values', extensions: ['csv'] }
      ];
      break;
  }

  const isZip =
    options.filetype === 'txt' ||
    (options.filetype === 'csv' &&
      (options.whoisreply === 'yes+inlineseparate' || options.whoisreply === 'yes+block'));
  const ext = isZip
    ? resExports.filetypeZip
    : options.filetype === 'csv'
      ? resExports.filetypeCsv
      : resExports.filetypeText;
  const filePath = dialog.showSaveDialogSync({
    title: 'Save export file',
    buttonLabel: 'Save',
    filters,
    defaultPath: resExports.autoGenerateFilename ? generateFilename(ext) : undefined
  });

  if (!filePath) {
    sender.send(IpcChannel.BulkwhoisExportCancel);
    return;
  }

  const exportSettings: ExportSettings = {
    separator: resExports.separator,
    enclosure: resExports.enclosure,
    linebreak: resExports.linebreak,
    filetypeText: resExports.filetypeText,
    filetypeCsv: resExports.filetypeCsv,
    filetypeZip: resExports.filetypeZip,
    openAfterExport: resExports.openAfterExport
  };

  const indices = buildExportIndices(results, options as ExportOptions);
  debug(formatString('Indices to export: {0}', indices));

  const { content, zip } = generateContent(
    results,
    indices,
    options as ExportOptions,
    exportSettings
  );
  if (content) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content);
    debug(formatString('File was saved, {0}', filePath));
  }

  if (isZip) {
    await writeZipArchive(zip, filePath, resExports.filetypeZip, resExports.openAfterExport);
  } else if (resExports.openAfterExport) {
    await shell.openPath(filePath);
  }

  sender.send(IpcChannel.BulkwhoisExportCancel);
});
