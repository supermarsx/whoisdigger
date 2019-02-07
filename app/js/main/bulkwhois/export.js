const electron = require('electron'),
  fs = require('fs'),
  path = require('path'),
  conversions = require('../../common/conversions.js'),
  debug = require('debug')('main.bulkwhois.export'),
  JSZip = require('jszip');

var {
  appSettings
} = require('../../appsettings.js');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

ipcMain.on('bulkwhois:export', function(event, results, options) {
  debug('options: \n {0}'.format(JSON.stringify(options)));
  //debug('results: \n {0}'.format(JSON.stringify(results)));

  var s = appSettings.export.separator, // Field separator char
    e = appSettings.export.enclosure, // Field enclosure char
    l = appSettings.export.linebreak, // Line break char
    txt = appSettings.export.textfile, // Text file
    csv = appSettings.export.csvfile, // CSV file
    zip = appSettings.export.zipfile, // Zip file
    filters;

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
  var filePath = dialog.showSaveDialog({
    title: "Save export file",
    buttonLabel: "Save",
    properties: ['openFile', 'showHiddenFiles'],
    filters: filters
  });
  if (filePath === undefined || filePath == '' || filePath === null) {
    debug("Using selected file at {0}".format(filePath));
    event.sender.send('bulkwhois:export.cancel');
  } else {
    var contentsExport = "",
      contentsHeader = "",
      contentsCompile, toProcess = [];

    // Add domains to queue
    for (var i = 0; i < results.id.length; i++) {
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
    for (var i = 0; i < results.id.length; i++) {
      if (options.errors == 'yes' && results.status[i] == 'error') {
        toProcess.push(i);
      }
    }
    debug('Available + Unavailable + Errors, {0}'.format(toProcess));



    var contentZip = new JSZip();

    if (options.filetype == 'txt') {
      for (var i = 0; i < toProcess.length; i++) {
        contentZip.file(results.domain[toProcess[i]] + txt, results.whoisreply[toProcess[i]]);
      }

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
      for (var i = 0; i < toProcess.length; i++) {
        contentsExport += '{2}{0}{3}{0}{1}{0}{4}{0}'.format(e, s, l, results.domain[toProcess[i]], results.status[toProcess[i]]);

        if (options.information.includes('basic') === true) {
          contentsExport += '{1}{0}{2}{0}{1}{0}{3}{0}{1}{0}{4}{0}{1}{0}{5}{0}{1}{0}{6}{0}'.format(e, s,
            results.registrar[toProcess[i]], results.company[toProcess[i]], results.creationdate[toProcess[i]], results.updatedate[toProcess[i]], results.expirydate[toProcess[i]]
          );
        }
        if (options.information.includes('debug') === true) {
          contentsExport += '{1}{0}{2}{0}{1}{0}{3}{0}'.format(e, s, results.id[toProcess[i]], results.requesttime[toProcess[i]]);
        }
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

    switch (options.whoisreply | options.filetype) {
      case ('yes+inlineseparate' | 'csv'):
      case ('yes+block' | 'csv'):
      case (true | 'txt'):
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
  event.sender.send('bulkwhois:export.cancel');

});
