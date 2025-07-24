import { settings } from '../settings-renderer.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import type { RendererElectronAPI } from '../../../../types/renderer-electron-api.js';

const electron = (window as any).electron as RendererElectronAPI;
import { tableReset } from './auxiliary.js';
import { getTimeEstimates } from './estimate.js';

const debug = debugFactory('bulkwhois.wordlistinput');
const error = errorFactory('bulkwhois.wordlistinput');
debug('loaded');

import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

let bwWordlistContents = ''; // Global wordlist input contents

document.getElementById('bwSuggestButton')?.addEventListener('click', async () => {
  const promptInput = document.getElementById('bwSuggestPrompt') as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  const prompt = String(promptInput?.value ?? '');
  if (!prompt) return;
  try {
    const words: string[] = await electron.invoke('ai:suggest', prompt, 5);
    if (words.length > 0) {
      const textarea = document.getElementById(
        'bwWordlistTextareaDomains'
      ) as HTMLTextAreaElement | null;
      if (!textarea) return;
      const current = String(textarea.value ?? '').trim();
      const prefix = current ? '\n' : '';
      textarea.value = current + prefix + words.join('\n');
    }
  } catch (e) {
    error(`Suggestion failed: ${e}`);
  }
});

/*
  electron.on('bulkwhois:wordlistinput.confirmation', function() {...});
    Wordlist input, contents confirmation container
 */
function handleWordlistConfirmation(): void {
  const bwFileStats: Record<string, any> = {};

  const textarea = document.getElementById(
    'bwWordlistTextareaDomains'
  ) as HTMLTextAreaElement | null;
  bwWordlistContents = String(textarea?.value ?? '');
  const confirmEl = document.getElementById('bwWordlistconfirm');
  const entryEl = document.getElementById('bwEntry');

  if (!bwWordlistContents) {
    confirmEl?.classList.add('is-hidden');
    entryEl?.classList.remove('is-hidden');
  } else {
    const infoSpan = document.getElementById('bwWordlistSpanInfo');
    infoSpan && (infoSpan.textContent = 'Loading wordlist stats...');
    infoSpan && (infoSpan.textContent = 'Getting line count...');
    bwFileStats['linecount'] = bwWordlistContents.toString().split('\n').length;

    const estimate = getTimeEstimates(bwFileStats['linecount'], settings);
    bwFileStats['minestimate'] = estimate.min;
    bwFileStats['maxestimate'] = estimate.max;

    if (estimate.max) {
      const minSpan = document.getElementById('bwWordlistSpanTimebetweenmin');
      const maxSpan = document.getElementById('bwWordlistSpanTimebetweenmax');
      minSpan &&
        (minSpan.textContent = formatString('{0}ms ', settings.lookupRandomizeTimeBetween.minimum));
      maxSpan &&
        (maxSpan.textContent = formatString(
          '/ {0}ms',
          settings.lookupRandomizeTimeBetween.maximum
        ));
      const estTd = document.getElementById('bwWordlistTdEstimate');
      estTd &&
        (estTd.textContent = formatString(
          '{0} to {1}',
          bwFileStats['minestimate'],
          bwFileStats['maxestimate']
        ));
    } else {
      document.getElementById('bwWordlistSpanTimebetweenminmax')?.classList.add('is-hidden');
      const minSpan = document.getElementById('bwWordlistSpanTimebetweenmin');
      minSpan && (minSpan.textContent = `${settings.lookupGeneral.timeBetween}ms`);
      const estTd = document.getElementById('bwWordlistTdEstimate');
      estTd && (estTd.textContent = formatString('> {0}', bwFileStats['minestimate']));
    }

    bwFileStats['filepreview'] = bwWordlistContents.toString().substring(0, 50);
    document.getElementById('bwWordlistloading')?.classList.add('is-hidden');
    confirmEl?.classList.remove('is-hidden');

    // stats
    const domainsTd = document.getElementById('bwWordlistTdDomains');
    domainsTd && (domainsTd.textContent = formatString('{0} line(s)', bwFileStats['linecount']));
    const previewTd = document.getElementById('bwWordlistTdFilepreview');
    previewTd && (previewTd.textContent = bwFileStats['filepreview'] + '...');
  }

  return;
}

electron.on(IpcChannel.BulkwhoisWordlistInputConfirmation, () => {
  handleWordlistConfirmation();
});

/*
  $('#bwEntryButtonWordlist').click(function() {...});
    Wordlist Input, Entry container button
 */
document.getElementById('bwEntryButtonWordlist')?.addEventListener('click', () => {
  document.getElementById('bwEntry')?.classList.add('is-hidden');
  document.getElementById('bwWordlistinput')?.classList.remove('is-hidden');
});

/*
  $('#bwWordlistinputButtonCancel').click(function() {...});
    Wordlist Input, cancel input
 */
document.getElementById('bwWordlistinputButtonCancel')?.addEventListener('click', () => {
  document.getElementById('bwWordlistinput')?.classList.add('is-hidden');
  document.getElementById('bwEntry')?.classList.remove('is-hidden');
});

/*
  $('#bwWordlistinputButtonConfirm').click(function() {...});
    Wordlist Input, go to confirm
 */
document.getElementById('bwWordlistinputButtonConfirm')?.addEventListener('click', () => {
  document.getElementById('bwWordlistinput')?.classList.add('is-hidden');
  void (async () => {
    await electron.invoke(IpcChannel.BulkwhoisInputWordlist);
    handleWordlistConfirmation();
  })();
});

/*
  $('#bwWordlistconfirmButtonCancel').click(function() {...});
     Wordlist input, cancel confirmation
 */
document.getElementById('bwWordlistconfirmButtonCancel')?.addEventListener('click', () => {
  document.getElementById('bwWordlistconfirm')?.classList.add('is-hidden');
  document.getElementById('bwEntry')?.classList.remove('is-hidden');
});

/*
  $('#bwWordlistconfirmButtonStart').click(function() {...});
    Wordlist input, proceed to bulk whois
 */
document.getElementById('bwWordlistconfirmButtonStart')?.addEventListener('click', () => {
  const bwDomainArray = bwWordlistContents
    .toString()
    .split('\n')
    .map(Function.prototype.call, String.prototype.trim);
  const tldsInput = document.getElementById('bwWordlistInputTlds') as HTMLInputElement | null;
  const bwTldsArray = (tldsInput?.value ?? '').toString().split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  document.getElementById('bwWordlistconfirm')?.classList.add('is-hidden');
  document.getElementById('bwProcessing')?.classList.remove('is-hidden');

  void electron.invoke(IpcChannel.BulkwhoisLookup, bwDomainArray, bwTldsArray);
});

/*
  $('#bwWordlistInputTlds').keyup(function(...) {...});
    ipsum
 */
document
  .getElementById('bwWordlistInputTlds')
  ?.addEventListener('keyup', (event: KeyboardEvent) => {
    event.preventDefault();
    if (event.key === 'Enter') {
      (
        document.getElementById('bwWordlistconfirmButtonStart') as HTMLButtonElement | null
      )?.click();
    }
  });
