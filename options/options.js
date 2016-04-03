// Saves options to chrome.storage
function save_options() {
  var PrincipalArn = document.getElementById('PrincipalArn').value;
  var RoleArn = document.getElementById('RoleArn').value;
  var FileName = document.getElementById('FileName').value;

  chrome.storage.sync.set({
    PrincipalArn: PrincipalArn,
    RoleArn: RoleArn,
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
    PrincipalArn: 'arn:aws:iam::123456789123:saml-provider/my-adfs',
    RoleArn: 'arn:aws:iam::123456789123:role/EC2Admin',
    FileName: 'credentials.txt'
  }, function(items) {
    document.getElementById('PrincipalArn').value = items.PrincipalArn;
    document.getElementById('RoleArn').value = items.RoleArn;
    document.getElementById('FileName').value = items.FileName;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);