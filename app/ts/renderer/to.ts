import { ipcRenderer } from 'electron';
import $ from '../../vendor/jquery.js';

let filePath: string | null = null;

/*
  ipcRenderer.on('to:fileinput.confirmation', function(event, path) {...});
    Confirm selected file for tools module
*/
ipcRenderer.on('to:fileinput.confirmation', function (event, path) {
  filePath = Array.isArray(path) ? path[0] : path;
  $('#toFileSelected').text(filePath ?? '');
});

/*
  $('#toButtonSelect').click(function() {...});
    Open file selection dialog
*/
$(document).on('click', '#toButtonSelect', function () {
  ipcRenderer.send('to:input.file');
});

/*
  $('#toButtonProcess').click(function() {...});
    Start processing with selected options
*/
$(document).on('click', '#toButtonProcess', async function () {
  if (!filePath) return;
  const options = collectOptions();
  try {
    await ipcRenderer.invoke('to:process', filePath, options);
  } catch (e) {
    ipcRenderer.send('app:error', `Processing failed: ${e}`);
  }
});

/*
  ipcRenderer.on('to:process.result', function(event, result) {...});
    Display processed output
*/
ipcRenderer.on('to:process.result', function (event, result: string) {
  $('#toOutput').text(result);
});

function collectOptions() {
  const opts: any = {};
  const prefix = $('#toPrefix').val() as string;
  const suffix = $('#toSuffix').val() as string;
  if (prefix) opts.prefix = prefix;
  if (suffix) opts.suffix = suffix;
  if ($('#toTrimSpaces').is(':checked')) opts.trimSpaces = true;
  if ($('#toDeleteBlank').is(':checked')) opts.deleteBlankLines = true;
  if ($('#toDedupe').is(':checked')) opts.dedupe = true;
  const sortVal = $('input[name=toSort]:checked').val();
  if (sortVal === 'asc' || sortVal === 'desc' || sortVal === 'random') {
    opts.sort = sortVal;
  }
  return opts;
}
