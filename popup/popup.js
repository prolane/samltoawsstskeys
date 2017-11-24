// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// On load of popup
$(function() {
  // On load of the popup screen check in Chrome's storage if the
  // 'SAML to AWS STS Keys' function is in a activated state or not.
  // Default value is 'activated'
  chrome.storage.sync.get({
    Activated: true
  }, function(items) {
    $('#activated').prop('checked', items.Activated);
  });

  // Add event handler to checkbox
  $('#activated').on('change', function() {

    var activated = $(this).prop('checked');
    // Save checkbox state to chrome.storage
    chrome.storage.sync.set({Activated: activated});

    var message = {};
    // If the checkbox is checked, an EventListener needs to be started for
    // webRequests to signin.aws.amazon.com in the background process
    if (activated) {
      message.action = 'addWebRequestEventListener';
    } else {
      message.action = 'removeWebRequestEventListener';
    }

    chrome.runtime.sendMessage(message, function(response) {
      console.log(response.message);
    });
  });
});
