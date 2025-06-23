// jshint esversion: 8

const electron = require('electron'),
  fs = require('fs'),
  path = require('path'),
  conversions = require('../../common/conversions'),
  debug = require('debug')('main.bw.export'),
  JSZip = require('jszip');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

const settings = require('../../common/settings').load();
import type { IpcMainEvent } from 'electron';

/*
  ipcMain.on('bw:export', function(...) {...});
    On event: bulk whois export event
  parameters
    event (object) - renderer object
    results (object) - bulk whois results object
    options (object) - bulk whois export options object
 */
ipcMain.on('bw:export', function(event: IpcMainEvent, results, options) {
  const {
    'lookup.export': resExports
  } = settings;

  const {
    sender
  } = event;

  const s = resExports.separator, // Field separation char
    e = resExports.enclosure, // Field enclosing char
    l = resExports.linebreak, // Line break char
    txt = resExports.filetypeText, // Text file
    csv = resExports.filetypeCsv, // CSV file
    zip = resExports.filetypeZip; // Zip file
  let filters;

  debug('options: \n {0}'.format(JSON.stringify(options)));
  debug('results: \n {0}'.format(JSON.stringify(results)));

  switch (options.filetype) {
    case 'txt':
      filters = [{
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
      filters = [{
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

  const filePath = dialog.showSaveDialogSync({
    title: "Save export file",
    buttonLabel: "Save",
    properties: ['openFile', 'showHiddenFiles'],
    filters: filters
  });

  if (filePath === undefined || filePath == '' || filePath === null) {
    debug("Using selected file at {0}".format(filePath));
    sender.send('bw:export.cancel');
  } else {
    let contentsExport = "",
      contentsHeader = "",
      contentsCompile;
    const toProcess = [];

    // Add domains to queue
    for (let i = 0; i < results.id.length; i++) {
      switch (options.domains) {
        case ('available'):
          if (results.status[i] == 'available') {
            toProcess.push(i);
          }
          break;
        case ('unavailable'):
          if (results.status[i] == 'unavailable') {
            toProcess.push(i);
          }
          break;
        case ('both'):
          if (results.status[i] == 'available' || results.status[i] == 'unavailable') {
            toProcess.push(i);
          }
          break;
      }
    }
    debug('Available + Unavailable, {0}'.format(toProcess));

    // Add errors to queue
    for (let i = 0; i < results.id.length; i++) {
      if (options.errors == 'yes' && results.status[i].includes('error')) {
        toProcess.push(i);
      }
    }
    debug('Available + Unavailable + Errors, {0}'.format(toProcess));

    const contentZip = new JSZip();

    if (options.filetype == 'txt') {
      for (let i = 0; i < toProcess.length; i++)
        contentZip.file(results.domain[toProcess[i]] + txt, results.whoisreply[toProcess[i]]);

    } else {
      // Make contentsHeader
      contentsHeader += '{0}Domain{0}{1}{0}Status{0}'.format(e, s);
      if (options.information.includes('basic') === true) {
        contentsHeader += '{1}{0}Registrar{0}{1}{0}Company{0}{1}{0}Creation Date{0}{1}{0}Update Date{0}{1}{0}Expiry Date{0}'.format(e, s);
      }
      if (options.information.includes('debug') === true) {
        contentsHeader += '{1}{0}ID{0}{1}{0}Request Time{0}'.format(e, s);
      }
      if (options.whoisreply.includes('yes+inline') === true) {
        contentsHeader += '{1}{0}Whois Reply{0}'.format(e, s);
      }
      // Process information for CSV
      for (let i = 0; i < toProcess.length; i++) {
        contentsExport += '{2}{0}{3}{0}{1}{0}{4}{0}'.format(e, s, l, results.domain[toProcess[i]], results.status[toProcess[i]]);

        if (options.information.includes('basic') === true) {
          contentsExport += '{1}{0}{2}{0}{1}{0}{3}{0}{1}{0}{4}{0}{1}{0}{5}{0}{1}{0}{6}{0}'.format(e, s,
            results.registrar[toProcess[i]], results.company[toProcess[i]], results.creationdate[toProcess[i]], results.updatedate[toProcess[i]], results.expirydate[toProcess[i]]
          );
        }

        if (options.information.includes('debug') === true)
          contentsExport += '{1}{0}{2}{0}{1}{0}{3}{0}'.format(e, s, results.id[toProcess[i]], results.requesttime[toProcess[i]]);

        switch (options.whoisreply) {
          case ('yes+inline'):
            contentsExport += '{1}{0}{2}{0}'.format(e, s, results.whoisreply[toProcess[i]]);
            break;
          case ('yes+inlineseparate'):
            contentZip.file(results.domain[toProcess[i]] + csv, results.whoisjson[toProcess[i]]);
            break;
          case ('yes+block'):
            contentZip.file(results.domain[toProcess[i]] + txt, results.whoisreply[toProcess[i]]);
            break;
        }
      }

      contentsCompile = contentsHeader + contentsExport;
      fs.writeFile(filePath, contentsCompile, function(err) {
        if (err) {
          return debug(err);
        }
        debug("File was saved, {0}".format(filePath));
      });
    }

    switch (true) {
      case (options.whoisreply == 'yes+inlineseparate' && options.filetype == 'csv'):
      case (options.whoisreply == 'yes+block' && options.filetype == 'csv'):
      case (options.filetype == 'txt'):
        if (JSZip.support.uint8array) {
          contentZip.generateAsync({
            type: "uint8array"
          }).then(function(content) {
            fs.writeFile(filePath + zip, content, function(err) {
              if (err) {
                return debug(err);
              }
            });
            debug("Zip saved, {0}".format(filePath + zip));
          }).catch(function(err) {
            debug("Error, {0}".format(err));
          });
        } else {
          contentZip.generateAsync({
            type: "string"
          }).then(function(content) {
            fs.writeFile(filePath + zip, content, function(err) {
              if (err) {
                return debug(err);
              }
            });
            debug("Zip saved, {0}".format(filePath + zip));
          }).catch(function(err) {
            debug("Error, {0}".format(err));
          });
        }
        break;
    }
  }
  sender.send('bw:export.cancel');

});
