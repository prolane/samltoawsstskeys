// Global variables
var FileName = 'credentials.txt';

// When this background process starts, load variables from chrome storage 
// from saved Extension Options
loadItemsFromStorage();
// Additionaly on start of the background process it is checked if this extension can be activated
chrome.storage.sync.get({
    // The default is activated
    Activated: true
  }, function(item) {
    if (item.Activated) addOnBeforeRequestEventListener();
});



// Function to be called when this extension is activated.
// This adds an EventListener for each request to signin.aws.amazon.com
function addOnBeforeRequestEventListener() {
  if (chrome.webRequest.onBeforeRequest.hasListener(onBeforeRequestEvent)) {
    console.log("ERROR: onBeforeRequest EventListener could not be added, because onBeforeRequest already has an EventListener.");
  } else {
    chrome.webRequest.onBeforeRequest.addListener(
      onBeforeRequestEvent,
      {urls: ["https://signin.aws.amazon.com/saml"]},
      ["requestBody"]
    );
  }
}



// Function to be called when this extension is de-actived
// by unchecking the activation checkbox on the popup page
function removeOnBeforeRequestEventListener() {
  chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestEvent);
}



// Callback function for the webRequest OnBeforeRequest EventListener
// This function runs on each request to https://signin.aws.amazon.com/saml
function onBeforeRequestEvent(details) {
  // Decode base64 SAML assertion in the request
  var samlXmlDoc = decodeURIComponent(unescape(window.atob(details.requestBody.formData.SAMLResponse[0])));
  // Convert XML String to DOM
  parser = new DOMParser()
  domDoc = parser.parseFromString(samlXmlDoc, "text/xml");
  // Get a list of claims (= AWS roles) from the SAML assertion
  var roleDomNodes = domDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes
  // Parse the PrincipalArn and the RoleArn from the SAML Assertion.
  var PrincipalArn = '';
  var RoleArn = '';
  var SAMLAssertion = details.requestBody.formData.SAMLResponse[0];
   // If there is more than 1 role in the claim, look at the 'roleIndex' HTTP Form data parameter to determine the role to assume
  if (roleDomNodes.length > 1 && "roleIndex" in details.requestBody.formData) {
    for (i = 0; i < roleDomNodes.length; i++) { 
      var nodeValue = roleDomNodes[i].innerHTML;
      if (nodeValue.indexOf(details.requestBody.formData.roleIndex[0]) > -1) {
        // This DomNode holdes the data for the role to assume. Use these details for the assumeRoleWithSAML API call
      	 RoleArn = nodeValue.substring(0, nodeValue.indexOf(','));
         PrincipalArn = nodeValue.substring(nodeValue.indexOf(',') + 1);
        assumeRoleWithSAML(PrincipalArn, RoleArn, SAMLAssertion);
      }
    }
  }
  // If there is just 1 role in the claim there will be no 'roleIndex' in the form data.
  else if (roleDomNodes.length == 1) {
    // When there is just 1 role in the claim, use these details for the assumeRoleWithSAML API call
  	 RoleArn = roleDomNodes[0].substring(0, roleDomNodes[0].indexOf(','));
     PrincipalArn = roleDomNodes[0].substring(roleDomNodes[0].indexOf(',') + 1);
    assumeRoleWithSAML(PrincipalArn, RoleArn, SAMLAssertion);
  }
}


// Function called from onBeforeRequestEvent when SAMLProvider, Role and SAMLAssertion is available
function assumeRoleWithSAML(PrincipalArn, RoleArn, SAMLAssertion) {
  // Set parameters needed for assumeRoleWithSAML method
  var params = {
    PrincipalArn: PrincipalArn,
    RoleArn: RoleArn,
    SAMLAssertion: SAMLAssertion,
  };
  // Call STS API from AWS
  var sts = new AWS.STS();
  sts.assumeRoleWithSAML(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      // On succesful API response create file with the STS keys
      let docContent = "[default] \n" +
        "aws_access_key_id = " + data.Credentials.AccessKeyId + " \n" +
        "aws_secret_access_key = " + data.Credentials.SecretAccessKey + " \n" +
        "aws_session_token = " + data.Credentials.SessionToken;
      let doc = URL.createObjectURL( new Blob([docContent], {type: 'application/octet-binary'}) );
      // Triggers download of the generated file
      chrome.downloads.download({ url: doc, filename: FileName, conflictAction: 'overwrite', saveAs: false });
    }        
  });
}



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
    // When the activation checkbox on the popup screen is checked/unchecked
    // the webRequest event listener needs to be added or removed.
    if (request.action == "addWebRequestEventListener") {
      addOnBeforeRequestEventListener();
      sendResponse({message: "webRequest EventListener added in background process."});
    }
    if (request.action == "removeWebRequestEventListener") {
      removeOnBeforeRequestEventListener();
      sendResponse({message: "webRequest EventListener removed in background process."});
    }
  });



function loadItemsFromStorage() {
  chrome.storage.sync.get({
    FileName: 'credentials.txt'
  }, function(items) {
    FileName = items.FileName;
  });
}
