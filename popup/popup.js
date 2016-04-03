// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// On load of popup
document.addEventListener('DOMContentLoaded', function() {
  // On load of the popup screen check in Chrome's storage if the
  // 'SAML to AWS STS Keys' function is in a activated state or not.
  // Default value is 'activated'
  chrome.storage.sync.get({
    Activated: true
  }, function(items) {
    document.getElementById('chkboxactivated').checked = items.Activated;
  });

  // Add event handler to checkbox
  document.getElementById('chkboxactivated').addEventListener('change', chkboxChangeHandler);
});



function chkboxChangeHandler(event) {
  var checkbox = event.target;
  // Save checkbox state to chrome.storage
  chrome.storage.sync.set({ Activated: checkbox.checked });
  // Default action for background process
  var action = "removeWebRequestEventListener";
  // If the checkbox is checked, an EventListener needs to be started for
  // webRequests to signin.aws.amazon.com in the background process
  if (checkbox.checked) {
    action = "addWebRequestEventListener";
  }
  chrome.runtime.sendMessage({action: action}, function(response) {
    console.log(response.message);
  });
}