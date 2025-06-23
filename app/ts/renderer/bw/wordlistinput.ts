
/** global: settings */
const conversions = require('../../common/conversions');
const { settings } = require('../../common/settings');

const {
  ipcRenderer
} = require('electron'), {
  tableReset
} = require('./auxiliary');

const { formatString } = require('../../common/stringformat');

var bwWordlistContents; // Global wordlist input contents

/*
  ipcRenderer.on('bw:wordlistinput.confirmation', function() {...});
    Wordlist input, contents confirmation container
 */
ipcRenderer.on('bw:wordlistinput.confirmation', function() {
  var bwFileStats = [];

  bwWordlistContents = $('#bwWordlistTextareaDomains').val().toString();
  if (bwWordlistContents === '' || bwWordlistContents === null) {
    $('#bwWordlistconfirm').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwWordlistSpanInfo').text('Loading wordlist stats...');
    $('#bwWordlistSpanInfo').text('Getting line count...');
    bwFileStats['linecount'] = bwWordlistContents.toString().split('\n').length;

    if (settings['lookup.randomize.timeBetween'].randomize === true) {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * settings['lookup.randomize.timeBetween'].minimum);
      bwFileStats['maxestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * settings['lookup.randomize.timeBetween'].maximum);
      $('#bwWordlistSpanTimebetweenmin').text(formatString('{0}ms ', settings['lookup.randomize.timeBetween'].minimum));
      $('#bwWordlistSpanTimebetweenmax').text(formatString('/ {0}ms', settings['lookup.randomize.timeBetween'].maximum));
      $('#bwWordlistTdEstimate').text(formatString('{0} to {1}', bwFileStats['minestimate'], bwFileStats['maxestimate']));
    } else {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * settings['lookup.general'].timeBetween);
      $('#bwWordlistSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwWordlistSpanTimebetweenmin').text(settings['lookup.general'].timeBetween + 'ms');
      $('#bwWordlistTdEstimate').text(formatString('> {0}', bwFileStats['minestimate']));
    }

    bwFileStats['filepreview'] = bwWordlistContents.toString().substring(0, 50);
    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwWordlistloading').addClass('is-hidden');
    $('#bwWordlistconfirm').removeClass('is-hidden');

    // stats
    $('#bwWordlistTdDomains').text(formatString('{0} line(s)', bwFileStats['linecount']));
    $('#bwWordlistTdFilepreview').text(bwFileStats['filepreview'] + '...');
  }

  return;
});

/*
  $('#bwEntryButtonWordlist').click(function() {...});
    Wordlist Input, Entry container button
 */
$(document).on('click', '#bwEntryButtonWordlist', function() {
  $('#bwEntry').addClass('is-hidden');
  $('#bwWordlistinput').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistinputButtonCancel').click(function() {...});
    Wordlist Input, cancel input
 */
$(document).on('click', '#bwWordlistinputButtonCancel', function() {
  $('#bwWordlistinput').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistinputButtonConfirm').click(function() {...});
    Wordlist Input, go to confirm
 */
$(document).on('click', '#bwWordlistinputButtonConfirm', function() {
  $('#bwWordlistinput').addClass('is-hidden');
  ipcRenderer.send("bw:input.wordlist");

  return;
});

/*
  $('#bwWordlistconfirmButtonCancel').click(function() {...});
     Wordlist input, cancel confirmation
 */
$(document).on('click', '#bwWordlistconfirmButtonCancel', function() {
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');

  return;
});

/*
  $('#bwWordlistconfirmButtonStart').click(function() {...});
    Wordlist input, proceed to bulk whois
 */
$(document).on('click', '#bwWordlistconfirmButtonStart', function() {
  var bwDomainArray = bwWordlistContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim),
    bwTldsArray = $('#bwWordlistInputTlds').val().toString().split(',');

  /*
  console.log(bwDomainArray);
  console.log(bwTldsArray);
  */

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  ipcRenderer.send("bw:lookup", bwDomainArray, bwTldsArray);

  return;
});

/*
  $('#bwWordlistInputTlds').keyup(function(...) {...});
    ipsum
 */
$('#bwWordlistInputTlds').keyup(function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwWordlistconfirmButtonStart').click();
  }

  return;
});
