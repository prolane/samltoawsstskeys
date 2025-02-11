// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// On load of popup
document.addEventListener('DOMContentLoaded', function() {
  // On load of the popup screen check in Chrome's storage if the
  // 'SAML to AWS STS Keys' function is in an activated state or not.
  // Default value is 'activated'
  chrome.storage.sync.get({
    Activated: true
  }, function(items) {
    document.getElementById('chkboxactivated').checked = items.Activated;
  });

 // Load the last saved status from local storage, if available.
 chrome.storage.local.get(["lastRole", "lastTimestamp"], function(items){
     if(items.lastRole && items.lastTimestamp) {
        updatePopupStatus(items.lastRole, items.lastTimestamp);
     }
 });
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

// Listen for status update messages from the background
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
 if (message.action === "updateStatus") {
     updatePopupStatus(message.latestRole, message.timestamp);
 }
});

// Update the status section in the popup with the latest role ARN and the "age"
function updatePopupStatus(latestRole, timestamp) {
   let latestRoleName = document.getElementById('latestRoleName');
   let latestRoleAge = document.getElementById('latestRoleAge');
   // Compute the age (in seconds) since the status was updated
   let ageSeconds = Math.floor((Date.now() - timestamp) / 1000);
   latestRoleName.innerHTML = "Role:" + latestRole + "<br>";
   latestRoleAge.innerHTML = "Age:" + ageSeconds + " sec<br>";
}