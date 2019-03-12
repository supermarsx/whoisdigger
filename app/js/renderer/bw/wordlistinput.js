/** global: appSettings */
const conversions = require('../../common/conversions.js'); // Conversions helper

var bwWordlistContents; // Global wordlist input contents

require('../../common/stringformat.js'); // String format override

const {
  ipcRenderer
} = require('electron');

const {
  tableReset
} = require('./auxiliary.js');

// Wordlist input, contents confirmation container
ipcRenderer.on('bw:wordlistinput.confirmation', function() {
  var bwFileStats = [];
  const {
    lookup
  } = appSettings;

  bwWordlistContents = $('#bwWordlistTextareaDomains').val().toString();
  if (bwWordlistContents == '' && bwWordlistContents === null) {
    $('#bwWordlistconfirm').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwWordlistSpanInfo').text('Loading wordlist stats...');
    $('#bwWordlistSpanInfo').text('Getting line count...');
    bwFileStats['linecount'] = bwWordlistContents.toString().split('\n').length;

    if (lookup.randomize.timebetween === true) {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timebetweenmin);
      bwFileStats['maxestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timebetweenmax);
      $('#bwWordlistSpanTimebetweenmin').text('{0}ms '.format(lookup.randomize.timebetweenmin));
      $('#bwWordlistSpanTimebetweenmax').text('/ {0}ms'.format(lookup.randomize.timebetweenmax));
      $('#bwWordlistTdEstimate').text('{0} to {1}'.format(bwFileStats['minestimate'], bwFileStats['maxestimate']));
    } else {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.timebetween);
      $('#bwWordlistSpanTimebetweenminmax').addClass('is-hidden');
      $('#bwWordlistSpanTimebetweenmin').text(lookup.timebetween + 'ms');
      $('#bwWordlistTdEstimate').text('> {0}'.format(bwFileStats['minestimate']));
    }

    bwFileStats['filepreview'] = bwWordlistContents.toString().substring(0, 50);
    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwWordlistloading').addClass('is-hidden');
    $('#bwWordlistconfirm').removeClass('is-hidden');

    // stats
    $('#bwWordlistTdDomains').text('{0} line(s)'.format(bwFileStats['linecount']));
    $('#bwWordlistTdFilepreview').text(bwFileStats['filepreview'] + '...');
  }
});

// Wordlist Input, Entry container button
$('#bwEntryButtonWordlist').click(function() {
  $('#bwEntry').addClass('is-hidden');
  $('#bwWordlistinput').removeClass('is-hidden');
});

// Wordlist Input, cancel input
$('#bwWordlistinputButtonCancel').click(function() {
  $('#bwWordlistinput').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Wordlist Input, go to confirm
$('#bwWordlistinputButtonStart').click(function() {
  $('#bwWordlistinput').addClass('is-hidden');
  ipcRenderer.send("bw:input.wordlist");
});

// Wordlist input, cancel confirmation
$('#bwWordlistconfirmButtonCancel').click(function() {
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Wordlist input, proceed to bulk whois
$('#bwWordlistconfirmButtonStart').click(function() {
  var bwDomainArray = bwWordlistContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim),
    bwTldsArray = $('#bwWordlistTextareaDomains').val().toString().split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwWordlistconfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  ipcRenderer.send("bw:lookup", bwDomainArray, bwTldsArray);
});

$('#bwWordlistInputTlds').keyup(function() {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwWordlistconfirmButtonStart').click();
  }
});
