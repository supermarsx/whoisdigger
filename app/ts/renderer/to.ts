import { ipcRenderer } from 'electron';
import { IpcChannel } from '../common/ipcChannels.js';
import $ from '../../vendor/jquery.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('renderer.to');
debug('loaded');

let filePath: string | null = null;

/*
  $('#toButtonSelect').click(function() {...});
    Open file selection dialog
*/
$(document).on('click', '#toButtonSelect', function () {
  void (async () => {
    const result = await ipcRenderer.invoke(IpcChannel.ToInputFile);
    filePath = Array.isArray(result) ? result[0] : result;
    $('#toFileSelected').text(filePath ?? '');
  })();
});

/*
  $('#toButtonProcess').click(function() {...});
    Start processing with selected options
*/
$(document).on('click', '#toButtonProcess', async function () {
  if (!filePath) return;
  const options = collectOptions();
  try {
    const result = await ipcRenderer.invoke(IpcChannel.ToProcess, filePath, options);
    $('#toOutput').text(result);
  } catch (e) {
    ipcRenderer.send('app:error', `Processing failed: ${e}`);
  }
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
