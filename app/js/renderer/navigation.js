// jshint esversion: 8

/*
  $(document).on('drop', function(...) {...});
    Prevent drop redirect
  parameters
    event (object)
 */
$(document).on('drop', function(event) {
  ipcRenderer.send('app:debug', "Preventing drag and drop redirect");
  event.preventDefault();
  return false;
});

/*
  $(document).on('dragover', function(...) {...});
    Prevent drag over redirect
  parameters
    event (object)
 */
$(document).on('dragover', function(event) {
  event.preventDefault();
  return false;
});

/*
  $('#navButtonDevtools').click(function() {...});
    On click: Button toggle developer tools
 */
$('#navButtonDevtools').click(function() {
  remote.getCurrentWindow().toggleDevTools();
  ipcRenderer.send('app:debug', "#navButtonDevtools was clicked");
});

/*
  $('section.tabs ul li').click(function() {...});
    On click: Toggle between tabs
 */
$('section.tabs ul li').click(function() {
  var tabName = $(this).attr('data-tab');

  if (tabName != '#') {
    $('section.tabs ul li').removeClass('is-active');
    $('div.container .tab-content').removeClass('current');

    $(this).addClass('is-active');
    $("#" + tabName).addClass('current');
  }
  ipcRenderer.send('app:debug', "#section.tabs switched to data tab, {0}".format(tabName));
});

/*
  $('.delete').click(function() {...});
    On click: Delete open notifications
 */
$('.delete').click(function() {
  ipcRenderer.send('app:debug', ".delete (notifications) was clicked");
  var notificationId = $(this).attr('data-notif');

  $('#' + notificationId).addClass('is-hidden');
});

/*
  $(document).keyup(function(...) {...});
    On keyup: Assign [ESC] key to close messages or modals
 */
$(document).keyup(function(event) {
  if (event.keyCode === 27) {
    ipcRenderer.send('app:debug', "Hotkey, Used [ESC] key, {0}".format(event.keyCode));
    switch (true) {

      // Single whois tab is active
      case ($('#navButtonSw').hasClass('is-active')):
        ipcRenderer.send('app:debug', "Hotkey, Single whois tab is active");
        switch (true) {
          case ($('#swDomainCopied').hasClass('is-active')):
            $('#swDomainCopiedClose').click();
            break;

          // Single whois, Dialog is open
          case ($('#swMessageWhois').hasClass('is-active')):
            $('#swMessageWhoisClose').click();
            break;

            // Single whois, Information table not hidden
          case (!$('#swTableWhoisinfo').hasClass('is-hidden')):
            $('#swTableWhoisinfo').addClass('is-hidden');
            break;

            // Single whois, Notification not hidden
          case (!$('.notification:not(.is-hidden)').hasClass('is-hidden')):
            $('.notification:not(.is-hidden)').addClass('is-hidden');
            break;
        }
        break;

        // Bulk whois tab is active
      case ($('#navButtonBw').hasClass('is-active')):
        ipcRenderer.send('app:debug', "Hotkey, Bulk whois tab is active");
        switch (true) {
          // Bulk whois, is Stop dialog open
          case ($('#bwProcessingModalStop').hasClass('is-active')):
            $('#bwProcessingModalStopButtonContinue').click();
            break;
        }
        break;
    }
  }
});

/*
  $('#navButtonExtendedmenu').click(function() {...});
    Button/Toggle special menu items
 */
$('#navButtonExtendedmenu').click(function() {
  ipcRenderer.send('app:debug', "#navButtonExtendedmenu was clicked");
  $('#navButtonExtendedmenu').toggleClass('is-active');
  $('.is-specialmenu').toggleClass('is-hidden');
});

/*
  $('#navButtonMinimize').click(function() {...});
    On click: Minimize window button
 */
$('#navButtonMinimize').click(function() {
  ipcRenderer.send('app:debug', "#navButtonMinimize was clicked");
  remote.getCurrentWindow().minimize();
});

/*
  $('#navButtonExit').click(function() {...});
    On click: Close main window button
 */
$('#navButtonExit').click(function() {
  ipcRenderer.send('app:debug', "#navButtonExit was clicked");
  remote.getCurrentWindow().close();
});
