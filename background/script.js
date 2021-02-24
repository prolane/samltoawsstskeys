// Global variables
let FileName = 'credentials';
let ApplySessionDuration = true;
let DebugLogs = false;
let RoleArns = {};
let LF = '\n';
// Change newline sequence when client is on Windows
if (navigator.userAgent.indexOf('Windows')  !== -1) {
  LF = '\r\n'
}

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
// Additionally on start of the background process it is checked if a new version
// of the plugin is installed. If so, show the user the changelog.
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install" || details.reason == "update"){
		// Open a new tab to show changelog html page
		chrome.tabs.create({url: "../options/changelog.html"});
    }
});



// Function to be called when this extension is activated.
// This adds an EventListener for each request to signin.aws.amazon.com
function addOnBeforeRequestEventListener() {
  if (DebugLogs) console.log('DEBUG: Extension is activated');
  if (chrome.webRequest.onBeforeRequest.hasListener(onBeforeRequestEvent)) {
    console.log("ERROR: onBeforeRequest EventListener could not be added, because " +
    "onBeforeRequest already has an EventListener.");
  } else {
    chrome.webRequest.onBeforeRequest.addListener(
      onBeforeRequestEvent,
      {urls: ["https://signin.aws.amazon.com/saml"]},
      ["requestBody"]
    );
    if (DebugLogs) console.log('DEBUG: onBeforeRequest Listener added');
  }
}



// Function to be called when this extension is de-actived
// by unchecking the activation checkbox on the popup page
function removeOnBeforeRequestEventListener() {
  chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestEvent);
}



// Callback function for the webRequest OnBeforeRequest EventListener
// This function runs on each request to https://signin.aws.amazon.com/saml
// This is where most of the magic of this extension comes together.
async function onBeforeRequestEvent(details) {
  if (DebugLogs) console.log('DEBUG: onBeforeRequest event hit!');
  // Get the SAML payload
  let samlXmlDoc = "";
  let formDataPayload = undefined;
  let SAMLAssertion = undefined;
  var roleIndex = undefined;
  // The SAML payload should normally be present as HTTP POST parameter 'SAMLResponse'
  // In reality, since Chrome 62 this broke for certain users. Although not for everyone.
  // As a backup, the raw request body can be used to extract the SAML payload.
  if (details.requestBody.formData) {
    if (DebugLogs) console.log('DEBUG: formData present.');
    // Decode the base64 encoded SAML payload. This will get us the the SAML payload (which is XML)
    SAMLAssertion = details.requestBody.formData.SAMLResponse[0];
    samlXmlDoc = decodeURIComponent(unescape(window.atob(SAMLAssertion)));
    // If the user is authorized for multiple IAM roles, the user will have made a choice for one
    // of these roles. The chosen role can be read from 'roleIndex'
    if ("roleIndex" in details.requestBody.formData) {
      roleIndex = details.requestBody.formData.roleIndex[0];
    }
  } else if (details.requestBody.raw) {
    let combined = new ArrayBuffer(0);
    details.requestBody.raw.forEach(function(element) { 
      let tmp = new Uint8Array(combined.byteLength + element.bytes.byteLength); 
      tmp.set( new Uint8Array(combined), 0 ); 
      tmp.set( new Uint8Array(element.bytes),combined.byteLength ); 
      combined = tmp.buffer;
    });
    let combinedView = new DataView(combined);
    let decoder = new TextDecoder('utf-8');
    formDataPayload = new URLSearchParams(decoder.decode(combinedView));
    // Decode the base64 encoded SAML payload. This will get us the the SAML payload (which is XML)
    SAMLAssertion = formDataPayload.get('SAMLResponse');
    samlXmlDoc = decodeURIComponent(unescape(window.atob(SAMLAssertion)))
    // If the user is authorized for multiple IAM roles, the user will have made a choice for one
    // of these roles. The chosen role can be read from 'roleIndex'
    roleIndex = formDataPayload.get('roleIndex'); // Will return 'null' if not found
  }
  if (DebugLogs) {
    console.log('DEBUG: samlXmlDoc:');
    console.log(samlXmlDoc);
  }
  // Parse the SAML XML document as DOM. This makes it easier to query data.
  parser = new DOMParser()
  domDoc = parser.parseFromString(samlXmlDoc, "text/xml");
  // Get the list of AWS roles (i.e. SAML claim) from the SAML assertion
  let roleDomNodes = domDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes
  // Only set the SessionDuration if it was supplied by the SAML provider and 
  // when the user has configured to use this feature.
  let SessionDuration = domDoc.querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/SessionDuration"]')[0]
  if (SessionDuration !== undefined && ApplySessionDuration) {
    SessionDuration = Number(SessionDuration.firstElementChild.textContent)
  } else {
    SessionDuration = null;
  }

  if (DebugLogs) {
    console.log('ApplySessionDuration: ' + ApplySessionDuration);
    console.log('SessionDuration: ' + SessionDuration);
    console.log('roleIndex: ' + roleIndex);
  }
  
  let roleNodeValue;
  // If there is more than 1 role in the claim and roleIndex is set (therefore 'true'), then 
  // look at the 'roleIndex' HTTP Form data parameter to determine the role to assume.
  if (roleDomNodes.length > 1 && roleIndex) {
    if (DebugLogs) console.log('DEBUG: More than one role claimed and role chosen.');
    for (i = 0; i < roleDomNodes.length; i++) { 
      let nodeValue = roleDomNodes[i].innerHTML;
      if (nodeValue.indexOf(roleIndex) > -1) {
        // This DomNode holdes the data for the role to assume.
        // (i.e. the ARN for the IAM role and the ARN of the saml-provider resource)
        roleNodeValue = nodeValue;
      }
    }
  }
  // If there is just 1 role in the claim there will be no 'roleIndex' in the form data.
  else if (roleDomNodes.length == 1) {
    // This DomNode holdes the data for the role to assume.
    // (i.e. the ARN for the IAM role and the ARN of the saml-provider resource)
    roleNodeValue = roleDomNodes[0].innerHTML;
  }
  else {
    if (DebugLogs) console.log('DEBUG: Not known which role to assume.');
    return; // No need to proceed any further
  }
  if (DebugLogs) console.log('DEBUG: roleNodeValue: ' + roleNodeValue);

  let keys; // To store the AWS access and access secret key 
  let credentials = ""; // Store all the content that needs to be written to the credentials file
  // Call AWS STS API to get credentials using the SAML Assertion
  try {
    let result = await assumeRoleWithSAML(roleNodeValue, SAMLAssertion, SessionDuration);
    keys = result; // Store the AWS credentials keys
    // Append AWS credentials keys as string to 'credentials' variable
    credentials = addProfileToCredentials(credentials, "default", keys.access_key_id, 
      keys.secret_access_key, keys.session_token)
  }
  catch(err) {
    console.log("ERROR: Error when trying to assume the IAM Role with the SAML Assertion.");
    console.log(err, err.stack);
    return;
  }
  // If there are extra Role ARNs configured in the options panel
  // then assume each role to get credentials keys for each.
  if (Object.keys(RoleArns).length > 0) {
    if (DebugLogs) console.log('DEBUG: Additional Role ARNs are configured');
    // Loop through each profile (each profile has a role ARN as value)
    let profileList = Object.keys(RoleArns);
    for (let i = 0; i < profileList.length; i++) {
      console.log('INFO: Do additional assume-role for role -> ' + RoleArns[profileList[i]] + 
      " with profile name '" + profileList[i] + "'.");
      // Call AWS STS API to get credentials using Access Key ID and Secret Access Key as authentication
      try {
        let result = await assumeRole(RoleArns[profileList[i]], profileList[i], keys.access_key_id,
          keys.secret_access_key, keys.session_token, SessionDuration);
        // Append AWS credentials keys as string to 'credentials' variable
        credentials = addProfileToCredentials(credentials, profileList[i], result.access_key_id,
          result.secret_access_key, result.session_token);
      }
      catch(err) {
        console.log("ERROR: Error when trying to assume additional IAM Role.");
        console.log(err, err.stack);
      }
    }
  } 

  // Write credentials to file
  console.log('Generate AWS tokens file.');
  outputDocAsDownload(credentials);
}



// Takes a Role Attribute from a SAMLAssertion as function argument (roleNodeValue). 
// This function extracts the RoleArn and PrincipalArn (SAML-provider)
// from this argument and uses it to call the AWS STS assumeRoleWithSAML API.
// Takes the SAMLAssertion as a second argument which is needed as authentication for the STS API.
function assumeRoleWithSAML(roleNodeValue, SAMLAssertion, SessionDuration) {
  return new Promise((resolve, reject) => {
    // Pattern for Role
    var reRole = /arn:aws:iam:[^:]*:[0-9]+:role\/[^,]+/i;
    // Patern for Principal (SAML Provider)
    var rePrincipal = /arn:aws:iam:[^:]*:[0-9]+:saml-provider\/[^,]+/i;
    // Extraxt both regex patterns from the roleNodeValue (which is a SAMLAssertion attribute)
    RoleArn = roleNodeValue.match(reRole)[0];
    PrincipalArn = roleNodeValue.match(rePrincipal)[0];
    
    if (DebugLogs) {
      console.log('RoleArn: ' + RoleArn);
      console.log('PrincipalArn: ' + PrincipalArn);
    }

    // Set parameters needed for AWS STS assumeRoleWithSAML API method
    var params = {
      PrincipalArn: PrincipalArn,
      RoleArn: RoleArn,
      SAMLAssertion: SAMLAssertion
    };
    if (SessionDuration !== null) {
      params['DurationSeconds'] = SessionDuration;
    }

    // Call STS API from AWS
    var sts = new AWS.STS();
    sts.assumeRoleWithSAML(params, function(err, data) {
      if (err) reject(err);
      else {
        // On succesful API response, return the STS keys 
        let keys = {
          access_key_id: data.Credentials.AccessKeyId,
          secret_access_key: data.Credentials.SecretAccessKey,
          session_token: data.Credentials.SessionToken,
        }
        if (DebugLogs) {
          console.log('DEBUG: Successfully assumed default profile');
          console.log('Received credentials:');
          console.log(keys);
        }
        resolve(keys);
      }        
    }); // End of STS call
  }); // End of Promise
} // End of assumeRoleWithSAML function



// Will fetch additional AWS credentials keys for 1 role
// The assume-role API is called using the earlier fetched AWS credentials keys
// (which where fetched using SAML) as authentication.
function assumeRole(roleArn, roleSessionName, AccessKeyId, SecretAccessKey,
  SessionToken, SessionDuration) {
  return new Promise((resolve, reject) => {
    // Set the fetched STS keys from the SAML response as credentials for doing the API call
    var options = {
      'accessKeyId': AccessKeyId,
      'secretAccessKey': SecretAccessKey,
      'sessionToken': SessionToken
    };
    var sts = new AWS.STS(options);
    // Set the parameters for the AssumeRole API call. Meaning: What role to assume
    var params = {
      RoleArn: roleArn,
      RoleSessionName: roleSessionName
    };
    if (SessionDuration !== null) {
      params['DurationSeconds'] = SessionDuration;
    }
    // Call the API
    sts.assumeRole(params, function(err, data) {
      if (err) reject(err);
      else {
        // On succesful API response, return the STS keys 
        let keys = {
          access_key_id: data.Credentials.AccessKeyId,
          secret_access_key: data.Credentials.SecretAccessKey,
          session_token: data.Credentials.SessionToken,
        }
        if (DebugLogs) {
          console.log("DEBUG: Successfully assumed additional Role. Profile name: '" + 
            roleSessionName + "'.");
          console.log("Received credentials:");
          console.log(keys);
        }
        resolve(keys);
      }
    }); // End of STS call
  }); // End of Promise
} // End of assumeRole function



// Append AWS credentials profile to the existing content of a credentials file
function addProfileToCredentials(credentials, profileName, AccessKeyId, SecretAcessKey, SessionToken) {
  credentials += "[" + profileName + "]" + LF +
  "aws_access_key_id=" + AccessKeyId + LF +
  "aws_secret_access_key=" + SecretAcessKey + LF +
  "aws_session_token=" + SessionToken + LF +
  LF;
  return credentials;
}



// Takes the content of an AWS SDK 'credentials' file as argument and will
// initiate a download in Chrome. 
// It should be saved to Chrome's Download directory automatically.
function outputDocAsDownload(docContent) {
  if (DebugLogs) {
    console.log('DEBUG: Now going to download credentials file. Document content:');
    console.log(docContent);
  }
  var doc = URL.createObjectURL( new Blob([docContent], {type: 'application/octet-binary'}) );
  if (DebugLogs) {
    console.log('DEBUG: Blob URL:' + doc);
  }
  // Triggers download of the generated file
	chrome.downloads.download({ url: doc, filename: FileName, conflictAction: 'overwrite', saveAs: false });
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
      if (DebugLogs) console.log('DEBUG: Extension enabled from popup');
      addOnBeforeRequestEventListener();
      sendResponse({message: "webRequest EventListener added in background process."});
    }
    if (request.action == "removeWebRequestEventListener") {
      if (DebugLogs) console.log('DEBUG: Extension disabled from popup');
      removeOnBeforeRequestEventListener();
      sendResponse({message: "webRequest EventListener removed in background process."});
    }
  });



function loadItemsFromStorage() {
  chrome.storage.sync.get({
    FileName: 'credentials',
    ApplySessionDuration: 'yes',
    DebugLogs: 'no',
    RoleArns: {}
  }, function(items) {
    FileName = items.FileName;
    if (items.ApplySessionDuration == "no") {
      ApplySessionDuration = false;
    } else {
      ApplySessionDuration = true;
    }
    if (items.DebugLogs == "no") {
      DebugLogs = false;
    } else {
      DebugLogs = true;
    }
    RoleArns = items.RoleArns;
  });
}
