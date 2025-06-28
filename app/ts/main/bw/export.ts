import electron from 'electron';
import fs from 'fs';
import path from 'path';
import * as conversions from '../../common/conversions.js';
import debugModule from 'debug';
const debug = debugModule('main.bw.export');
import JSZip from 'jszip';
import { formatString } from '../../common/stringformat.js';

const { app, BrowserWindow, Menu, ipcMain, dialog, remote, shell } = electron;

import { getSettings } from '../../common/settings.js';

export function generateFilename(ext: string): string {
  function pad(n: number): string {
    return String(n).padStart(2, '0');
  }
  const d = new Date();
  const datetime =
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `bulkwhois-export-${datetime}-${hex}${ext}`;
}

/*
  ipcMain.on('bw:export', function(...) {...});
    On event: bulk whois export event
  parameters
    event (object) - renderer object
    results (object) - bulk whois results object
    options (object) - bulk whois export options object
 */
ipcMain.handle('bw:export', async function (event, results, options) {
  const { lookupExport: resExports } = getSettings();

  const { sender } = event;

  const s = resExports.separator, // Field separation char
    e = resExports.enclosure, // Field enclosing char
    l = resExports.linebreak, // Line break char
    txt = resExports.filetypeText, // Text file
    csv = resExports.filetypeCsv, // CSV file
    zip = resExports.filetypeZip; // Zip file
  let filters;

  debug(formatString('options: \n {0}', JSON.stringify(options)));
  debug(formatString('results: \n {0}', JSON.stringify(results)));

  switch (options.filetype) {
    case 'txt':
      filters = [
        {
          name: 'All files',
          extensions: ['*']
        },
        {
          name: 'Plain text files',
          extensions: ['txt']
        }
      ];
      break;
    case 'csv':
      filters = [
        {
          name: 'All files',
          extensions: ['*']
        },
        {
          name: 'Comma-separated values',
          extensions: ['csv']
        }
      ];
      break;
  }

  const isZip =
    options.filetype === 'txt' ||
    (options.filetype === 'csv' &&
      (options.whoisreply === 'yes+inlineseparate' || options.whoisreply === 'yes+block'));
  const ext = isZip ? zip : options.filetype === 'csv' ? csv : txt;
  const filePath = dialog.showSaveDialogSync({
    title: 'Save export file',
    buttonLabel: 'Save',
    filters,
    defaultPath: resExports.autoGenerateFilename ? generateFilename(ext) : undefined
  });

  if (filePath === undefined || filePath == '' || filePath === null) {
    debug(formatString('Using selected file at {0}', filePath));
    sender.send('bw:export.cancel');
  } else {
    let contentsExport = '',
      contentsHeader = '',
      contentsCompile;
    const toProcess = [];

    // Add domains to queue
    for (let i = 0; i < results.id.length; i++) {
      switch (options.domains) {
        case 'available':
          if (results.status[i] == 'available') {
            toProcess.push(i);
          }
          break;
        case 'unavailable':
          if (results.status[i] == 'unavailable') {
            toProcess.push(i);
          }
          break;
        case 'both':
          if (results.status[i] == 'available' || results.status[i] == 'unavailable') {
            toProcess.push(i);
          }
          break;
      }
    }
    debug(formatString('Available + Unavailable, {0}', toProcess));

    // Add errors to queue
    for (let i = 0; i < results.id.length; i++) {
      if (options.errors == 'yes' && results.status[i].includes('error')) {
        toProcess.push(i);
      }
    }
    debug(formatString('Available + Unavailable + Errors, {0}', toProcess));

    const contentZip = new JSZip();

    if (options.filetype == 'txt') {
      for (let i = 0; i < toProcess.length; i++)
        contentZip.file(results.domain[toProcess[i]] + txt, results.whoisreply[toProcess[i]]);
    } else {
      // Make contentsHeader
      contentsHeader += formatString('{0}Domain{0}{1}{0}Status{0}', e, s);
      if (options.information.includes('basic') === true) {
        contentsHeader += formatString(
          '{1}{0}Registrar{0}{1}{0}Company{0}{1}{0}Creation Date{0}{1}{0}Update Date{0}{1}{0}Expiry Date{0}',
          e,
          s
        );
      }
      if (options.information.includes('debug') === true) {
        contentsHeader += formatString('{1}{0}ID{0}{1}{0}Request Time{0}', e, s);
      }
      if (options.whoisreply.includes('yes+inline') === true) {
        contentsHeader += formatString('{1}{0}Whois Reply{0}', e, s);
      }
      // Process information for CSV
      for (let i = 0; i < toProcess.length; i++) {
        contentsExport += formatString(
          '{2}{0}{3}{0}{1}{0}{4}{0}',
          e,
          s,
          l,
          results.domain[toProcess[i]],
          results.status[toProcess[i]]
        );

        if (options.information.includes('basic') === true) {
          contentsExport += formatString(
            '{1}{0}{2}{0}{1}{0}{3}{0}{1}{0}{4}{0}{1}{0}{5}{0}{1}{0}{6}{0}',
            e,
            s,
            results.registrar[toProcess[i]],
            results.company[toProcess[i]],
            results.creationdate[toProcess[i]],
            results.updatedate[toProcess[i]],
            results.expirydate[toProcess[i]]
          );
        }

        if (options.information.includes('debug') === true)
          contentsExport += formatString(
            '{1}{0}{2}{0}{1}{0}{3}{0}',
            e,
            s,
            results.id[toProcess[i]],
            results.requesttime[toProcess[i]]
          );

        switch (options.whoisreply) {
          case 'yes+inline':
            contentsExport += formatString('{1}{0}{2}{0}', e, s, results.whoisreply[toProcess[i]]);
            break;
          case 'yes+inlineseparate':
            contentZip.file(results.domain[toProcess[i]] + csv, results.whoisjson[toProcess[i]]);
            break;
          case 'yes+block':
            contentZip.file(results.domain[toProcess[i]] + txt, results.whoisreply[toProcess[i]]);
            break;
        }
      }

      contentsCompile = contentsHeader + contentsExport;
      try {
        await fs.promises.writeFile(filePath, contentsCompile);
        debug(formatString('File was saved, {0}', filePath));
      } catch (err) {
        debug(err);
        throw err;
      }
    }

    switch (true) {
      case options.whoisreply == 'yes+inlineseparate' && options.filetype == 'csv':
      case options.whoisreply == 'yes+block' && options.filetype == 'csv':
      case options.filetype == 'txt':
        try {
          const genType = JSZip.support.uint8array ? 'uint8array' : 'string';
          const content = await contentZip.generateAsync({ type: genType });
          const target = filePath.endsWith(zip) ? filePath : filePath + zip;
          await fs.promises.writeFile(target, content);
          debug(formatString('Zip saved, {0}', target));
          if (resExports.openAfterExport) {
            await shell.openPath(target);
          }
        } catch (err) {
          debug(formatString('Error, {0}', err));
          throw err;
        }
        break;
    }
    if (!isZip && resExports.openAfterExport) {
      await shell.openPath(filePath);
    }
  }
  sender.send('bw:export.cancel');
});
