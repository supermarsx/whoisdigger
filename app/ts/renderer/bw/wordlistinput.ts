import * as conversions from '../../common/conversions.js';
import { settings } from '../settings-renderer.js';

const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (...args: any[]) => void) => void;
};
import { tableReset } from './auxiliary.js';
import $ from '../../../vendor/jquery.js';

import { formatString } from '../../common/stringformat.js';
import { IpcChannel } from '../../common/ipcChannels.js';

let bwWordlistContents = ''; // Global wordlist input contents

$(document).on('click', '#bwSuggestButton', async () => {
  const prompt = String($('#bwSuggestPrompt').val() ?? '');
  if (!prompt) return;
  try {
    const words: string[] = await electron.invoke('ai:suggest', prompt, 5);
    if (words.length > 0) {
      const textarea = $('#bwWordlistTextareaDomains');
      const current = String(textarea.val() ?? '').trim();
      const prefix = current ? '\n' : '';
      textarea.val(current + prefix + words.join('\n'));
    }
  } catch (e) {
    electron.send('app:error', `Suggestion failed: ${e}`);
  }
});

/*
  electron.on('bw:wordlistinput.confirmation', function() {...});
    Wordlist input, contents confirmation container
 */
function handleWordlistConfirmation(): void {
  const bwFileStats: Record<string, any> = {};

  bwWordlistContents = String($('#bwWordlistTextareaDomains').val() ?? '');
  if (bwWordlistContents === '' || bwWordlistContents === null) {
    $('#bwWordlistconfirm').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwWordlistSpanInfo').text('Loading wordlist stats...');
    $('#bwWordlistSpanInfo').text('Getting line count...');
    bwFileStats['linecount'] = bwWordlistContents.toString().split('\n').length;

    if (settings.lookupRandomizeTimeBetween.randomize === true) {
      bwFileStats['minestimate'] = conversions.msToHumanTime(
        bwFileStats['linecount'] * settings.lookupRandomizeTimeBetween.minimum
      );
      bwFileStats['maxestimate'] = conversions.msToHumanTime(
        bwFileStats['linecount'] * settings.lookupRandomizeTimeBetween.maximum
      );
      $('#bwWordlistSpanTimebetweenmin').text(
        formatString('{0}ms ', settings.lookupRandomizeTimeBetween.minimum)
      );
      $('#bwWordlistSpanTimebetweenmax').text(
        formatString('/ {0}ms', settings.lookupRandomizeTimeBetween.maximum)
      );
      $('#bwWordlistTdEstimate').text(
        formatString('{0} to {1}', bwFileStats['minestimate'], bwFileStats['maxestimate'])
      );
    } else {
      bwFileStats['minestimate'] = conversions.msToHumanTime(
        bwFileStats['linecount'] * settings.lookupGeneral.timeBetween
      );
      $('#bwWordlistSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwWordlistSpanTimebetweenmin').text(settings.lookupGeneral.timeBetween + 'ms');
      $('#bwWordlistTdEstimate').text(formatString('> {0}', bwFileStats['minestimate']));
    }

    bwFileStats['filepreview'] = bwWordlistContents.toString().substring(0, 50);
    $('#bwWordlistloading').addClass('is-hidden');
    $('#bwWordlistconfirm').removeClass('is-hidden');

    // stats
    $('#bwWordlistTdDomains').text(formatString('{0} line(s)', bwFileStats['linecount']));
    $('#bwWordlistTdFilepreview').text(bwFileStats['filepreview'] + '...');
  }

  return;
}

electron.on('bw:wordlistinput.confirmation', () => {
  handleWordlistConfirmation();
});

/*
  $('#bwEntryButtonWordlist').click(function() {...});
    Wordlist Input, Entry container button
 */
$(document).on('click', '#bwEntryButtonWordlist', function () {
  $('#bwEntry').addClass('is-hidden');
  $('#bwWordlistinput').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistinputButtonCancel').click(function() {...});
    Wordlist Input, cancel input
 */
$(document).on('click', '#bwWordlistinputButtonCancel', function () {
  $('#bwWordlistinput').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistinputButtonConfirm').click(function() {...});
    Wordlist Input, go to confirm
 */
$(document).on('click', '#bwWordlistinputButtonConfirm', function () {
  $('#bwWordlistinput').addClass('is-hidden');
  void (async () => {
    await electron.invoke(IpcChannel.BwInputWordlist);
    handleWordlistConfirmation();
  })();

  return;
});

/*
  $('#bwWordlistconfirmButtonCancel').click(function() {...});
     Wordlist input, cancel confirmation
 */
$(document).on('click', '#bwWordlistconfirmButtonCancel', function () {
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistconfirmButtonStart').click(function() {...});
    Wordlist input, proceed to bulk whois
 */
$(document).on('click', '#bwWordlistconfirmButtonStart', function () {
  const bwDomainArray = bwWordlistContents
    .toString()
    .split('\n')
    .map(Function.prototype.call, String.prototype.trim);
  const bwTldsArray = (
    ($('#bwWordlistInputTlds').val() as string | number | string[] | undefined) || ''
  )
    .toString()
    .split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  void electron.invoke(IpcChannel.BwLookup, bwDomainArray, bwTldsArray);

  return;
});

/*
  $('#bwWordlistInputTlds').keyup(function(...) {...});
    ipsum
 */
$('#bwWordlistInputTlds').keyup(function (event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwWordlistconfirmButtonStart').click();
  }

  return;
});
