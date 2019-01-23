/** global: appSettings */
const whois = require('../../common/whoiswrapper.js'),
  conversions = require('../../common/conversions.js');

var bwWordlistContents;

require('../../common/stringformat.js');

const {
  ipcRenderer
} = require('electron');

const {
  tableReset
} = require('./auxiliary.js');

// Wordlist input, contents confirmation container
ipcRenderer.on('bulkwhois:wordlistinput.confirmation', function() {
  var bwFileStats = [];
  const {
    lookup
  } = appSettings;

  bwWordlistContents = $('#bwwWordlistText').val().toString();
  if (bwWordlistContents == '' && bwWordlistContents === null) {
    $('#bwWordlistConfirm').addClass('is-hidden');
    $('#bwEntry').removeClass('is-hidden');
  } else {
    $('#bwwLoadingInfo').text('Loading wordlist stats...');
    $('#bwwLoadingInfo').text('Getting line count...');
    bwFileStats['linecount'] = bwWordlistContents.toString().split('\n').length;

    if (lookup.randomize.timebetween === true) {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timebetweenmin);
      bwFileStats['maxestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.randomize.timebetweenmax);
      $('#bwwtimebetweenmin').text('{0}ms '.format(lookup.randomize.timebetweenmin));
      $('#bwwtimebetweenmax').text('/ {0}ms'.format(lookup.randomize.timebetweenmax));
      $('#bwwTableMinMaxEstimate').text('{0} to {1}'.format(bwFileStats['minestimate'], bwFileStats['maxestimate']));
    } else {
      bwFileStats['minestimate'] = conversions.msToHumanTime(bwFileStats['linecount'] * lookup.timebetween);
      $('#bwwtimebetweenmaxtext').addClass('is-hidden');
      $('#bwwtimebetweenmin').text(lookup.timebetween + 'ms');
      $('#bwwTableMinMaxEstimate').text('> {0}'.format(bwFileStats['minestimate']));
    }

    bwFileStats['filepreview'] = bwWordlistContents.toString().substring(0, 50);
    //console.log(readLines(filePath[0]));
    //console.log(bwFileStats['filepreview']);

    //console.log(lineCount(bwFileContents));
    $('#bwWordlistLoading').addClass('is-hidden');
    $('#bwWordlistConfirm').removeClass('is-hidden');

    // stats
    $('#bwwTableFileSize').text('{0} line(s)'.format(bwFileStats['linecount']));
    $('#bwwTableFilePreview').text(bwFileStats['filepreview'] + '...');
  }
});

// Wordlist Input, Entry container button
$('#bweButtonListInput').click(function() {
  $('#bwEntry').addClass('is-hidden');
  $('#bwWordlistInput').removeClass('is-hidden');
});

// Wordlist Input, Cancel file confirmation
$('#bwiButtonCancel').click(function() {
  $('#bwWordlistInput').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Wordlist Input, Proceed to confirmation
$('#bwiButtonConfirm').click(function() {
  $('#bwWordlistInput').addClass('is-hidden');
  ipcRenderer.send("bulkwhois:input.wordlist");
});

// Wordlist input, cancel confirmation
$('#bwwButtonCancel').click(function() {
  $('#bwWordlistConfirm').addClass('is-hidden');
  $('#bwEntry').removeClass('is-hidden');
});

// Wordlist input, proceed to bulk whois
$('#bwwButtonConfirm').click(function() {
  var bwDomainArray = bwWordlistContents.toString().split('\n').map(Function.prototype.call, String.prototype.trim),
    bwTldsArray = $('#bwwSearchTlds').val().toString().split(',');

  tableReset(bwDomainArray.length, bwTldsArray.length);
  $('#bwWordlistConfirm').addClass('is-hidden');
  $('#bwProcessing').removeClass('is-hidden');

  ipcRenderer.send("bulkwhois:lookup", bwDomainArray, bwTldsArray);
});

document.getElementById('bwwSearchTlds').addEventListener("keyup", function(event) {
  // Cancel the default action, if needed
  event.preventDefault();
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    // Trigger the button element with a click
    $('#bwwButtonConfirm').click();
  }
});
