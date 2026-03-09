// Renderer: Text Operations page
import type { ProcessOptions } from '../../../common/tools.js';
import { openFileDialog } from '../../../common/bridge/dialogs.js';
import { toProcess } from '../../../common/bridge/textops.js';
import { debugFactory, errorFactory } from '../../../common/logger.js';

const debug = debugFactory('renderer.features.textops');
const error = errorFactory('renderer.features.textops');
debug('loaded');

let filePath: string | null = null;

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.matches('#toButtonSelect')) {
    const result = await openFileDialog({
      multiple: false,
      filters: [{ name: 'Text', extensions: ['txt', 'list', 'csv'] }]
    });
    filePath = Array.isArray(result) ? result[0] : result;
    const fileLabel = document.querySelector<HTMLElement>('#toFileSelected');
    if (fileLabel) fileLabel.textContent = filePath ?? '';
  } else if (target.matches('#toButtonProcess')) {
    if (!filePath) return;
    const options = collectOptions();
    try {
      const result = await toProcess(filePath, options);
      const output = document.querySelector<HTMLElement>('#toOutput');
      if (output) output.textContent = result;
    } catch (e) {
      error(`Processing failed: ${e}`);
    }
  }
});

function collectOptions(): ProcessOptions {
  const opts: ProcessOptions = {};
  const prefixInput = document.querySelector<HTMLInputElement>('#toPrefix');
  const suffixInput = document.querySelector<HTMLInputElement>('#toSuffix');
  const prefix = prefixInput?.value ?? '';
  const suffix = suffixInput?.value ?? '';
  if (prefix) opts.prefix = prefix;
  if (suffix) opts.suffix = suffix;

  if (document.querySelector<HTMLInputElement>('#toTrimSpaces')?.checked) opts.trimSpaces = true;
  if (document.querySelector<HTMLInputElement>('#toDeleteBlank')?.checked) {
    opts.deleteBlankLines = true;
  }
  if (document.querySelector<HTMLInputElement>('#toDedupe')?.checked) opts.dedupe = true;

  const sortRadio = document.querySelector<HTMLInputElement>('input[name=toSort]:checked');
  const sortVal = sortRadio?.value;
  if (sortVal === 'asc' || sortVal === 'desc' || sortVal === 'random') {
    opts.sort = sortVal;
  }
  return opts;
}
