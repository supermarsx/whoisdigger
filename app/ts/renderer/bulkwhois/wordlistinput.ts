import { settings } from '../state/settings-store.js';
import { debugFactory, errorFactory } from '../../common/logger.js';
import { aiSuggest } from '../../common/bridge/ai.js';
import { bulkWhoisLookupFromContent } from '../../common/bridge/bulk.js';
import { bulkEstimateTime } from '../../common/bridge/filesystem.js';
import { countLines } from '../../common/bridge/app.js';
import { listen } from '../../common/bridge/core.js';

import { tableReset } from './auxiliary.js';

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
    const words: string[] = await aiSuggest(prompt, 5);
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
async function handleWordlistConfirmation(): Promise<void> {
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
    const lineCount = await countLines(bwWordlistContents);

    const estimate = await bulkEstimateTime(lineCount, {
      timeBetween: settings.lookupGeneral.timeBetween,
      randomize: settings.lookupRandomizeTimeBetween.randomize,
      timeBetweenMin: settings.lookupRandomizeTimeBetween.minimum,
      timeBetweenMax: settings.lookupRandomizeTimeBetween.maximum,
    });

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
          estimate.min,
          estimate.max
        ));
    } else {
      document.getElementById('bwWordlistSpanTimebetweenminmax')?.classList.add('is-hidden');
      const minSpan = document.getElementById('bwWordlistSpanTimebetweenmin');
      minSpan && (minSpan.textContent = `${settings.lookupGeneral.timeBetween}ms`);
      const estTd = document.getElementById('bwWordlistTdEstimate');
      estTd && (estTd.textContent = formatString('> {0}', estimate.min));
    }

    const filepreview = bwWordlistContents.toString().substring(0, 50);
    document.getElementById('bwWordlistloading')?.classList.add('is-hidden');
    confirmEl?.classList.remove('is-hidden');

    // stats
    const domainsTd = document.getElementById('bwWordlistTdDomains');
    domainsTd && (domainsTd.textContent = formatString('{0} line(s)', lineCount));
    const previewTd = document.getElementById('bwWordlistTdFilepreview');
    previewTd && (previewTd.textContent = filepreview + '...');
  }
}

void listen(IpcChannel.BulkwhoisWordlistInputConfirmation, () => {
  void handleWordlistConfirmation();
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
  // BulkwhoisInputWordlist is a client-side noop in Tauri
  void handleWordlistConfirmation();
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
  const tldsInput = document.getElementById('bwWordlistInputTlds') as HTMLInputElement | null;
  const bwTldsArray = (tldsInput?.value ?? '').toString().split(',');

  // Count lines server-side for tableReset dimension
  void countLines(bwWordlistContents).then((lineCount) => {
    tableReset(lineCount, bwTldsArray.length);
    document.getElementById('bwWordlistconfirm')?.classList.add('is-hidden');
    document.getElementById('bwProcessing')?.classList.remove('is-hidden');

    // Splitting, trimming & lookup all happen server-side via rayon
    void bulkWhoisLookupFromContent(bwWordlistContents, bwTldsArray);
  });
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
