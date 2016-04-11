// Saves options to chrome.storage
function save_options() {
  var FileName = document.getElementById('FileName').value;

  chrome.storage.sync.set({
    FileName: FileName
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });

  // Notify background process of changed storage items.
  chrome.runtime.sendMessage({action: "reloadStorageItems"}, function(response) {
    console.log(response.message);
  });
}

// Restores state using the preferences stored in chrome.storage.
function restore_options() {
  // Default values
  chrome.storage.sync.get({
    FileName: 'credentials.txt'
  }, function(items) {
    document.getElementById('FileName').value = items.FileName;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);