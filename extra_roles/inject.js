

// Global variables
var FileName = 'credentials';
var RoleArns = {};

// When this background process starts, load variables from chrome storage 
// from saved Extension Options
loadItemsFromStorage();


// This Listener receives messages from options.js and popup.js
// Received messages are meant to affect the background process.
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // When the options are changed in the Options panel
    // these items need to be reloaded in this background process.
    if (request.action == "reloadStorageItems") {
      loadItemsFromStorage();
      sendResponse({message: "Storage items reloaded in background process."});
    }
  });


// This injects the extar roles
function loadItemsFromStorage() {
  chrome.storage.sync.get({
    FileName: 'credentials',
	RoleArns: {}
  }, function(items) {
    FileName = items.FileName;
    RoleArns = items.RoleArns;
    var s = document.createElement('script');
    s.text = "document.extraRoles = " + JSON.stringify(RoleArns);
    (document.head || document.documentElement).appendChild(s);
        // with the extra roles loaded we run out script
        var y = document.createElement('script');
        y.src = chrome.extension.getURL('extra_roles/roles.js');
        y.onload = function() {
        this.parentNode.removeChild(this);
      };
      (document.head || document.documentElement).appendChild(y);

  });
}
