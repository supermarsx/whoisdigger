// In the renderer process we access IPC methods exposed from the preload script
// via the `window.electron` bridge instead of importing from 'electron'.
import type { RendererElectronAPI } from '../../../types/renderer-electron-api.js';
const { invoke } = (window as any).electron as RendererElectronAPI;
import { IpcChannel } from '../common/ipcChannels.js';
import { debugFactory, errorFactory } from '../common/logger.js';

const debug = debugFactory('renderer.to');
const error = errorFactory('renderer.to');
debug('loaded');

let filePath: string | null = null;

/*
  $('#toButtonSelect').click(function() {...});
    Open file selection dialog
*/
document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.matches('#toButtonSelect')) {
    const result = await invoke(IpcChannel.ToInputFile);
    filePath = Array.isArray(result) ? result[0] : result;
    const fileLabel = document.querySelector<HTMLElement>('#toFileSelected');
    if (fileLabel) fileLabel.textContent = filePath ?? '';
  } else if (target.matches('#toButtonProcess')) {
    if (!filePath) return;
    const options = collectOptions();
    try {
      const result = await invoke(IpcChannel.ToProcess, filePath, options);
      const output = document.querySelector<HTMLElement>('#toOutput');
      if (output) output.textContent = result;
    } catch (e) {
      error(`Processing failed: ${e}`);
    }
  }
});

function collectOptions() {
  const opts: any = {};
  const prefixInput = document.querySelector<HTMLInputElement>('#toPrefix');
  const suffixInput = document.querySelector<HTMLInputElement>('#toSuffix');
  const prefix = prefixInput?.value ?? '';
  const suffix = suffixInput?.value ?? '';
  if (prefix) opts.prefix = prefix;
  if (suffix) opts.suffix = suffix;

  if (document.querySelector<HTMLInputElement>('#toTrimSpaces')?.checked) opts.trimSpaces = true;
  if (document.querySelector<HTMLInputElement>('#toDeleteBlank')?.checked)
    opts.deleteBlankLines = true;
  if (document.querySelector<HTMLInputElement>('#toDedupe')?.checked) opts.dedupe = true;

  const sortRadio = document.querySelector<HTMLInputElement>('input[name=toSort]:checked');
  const sortVal = sortRadio?.value;
  if (sortVal === 'asc' || sortVal === 'desc' || sortVal === 'random') {
    opts.sort = sortVal;
  }
  return opts;
}
