importScripts(
  "../lib/fxparser.min.js" // https://github.com/NaturalIntelligence/fast-xml-parser
)

// Global variables
let FileName = 'credentials';
let ApplySessionDuration = true;
let DebugLogs = false;
let RoleArns = {};
let LF = '\n';

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
// Additionally on start of the background process it is checked if a new version of the plugin is installed.
// If so, show the user the changelog
// var thisVersion = chrome.runtime.getManifest().version;
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
    console.log("ERROR: onBeforeRequest EventListener could not be added, because onBeforeRequest already has an EventListener.");
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
function onBeforeRequestEvent(details) {
  if (DebugLogs) console.log('DEBUG: onBeforeRequest event hit!');
  // Get the SAML payload
  let samlXmlDoc = "";
  let formDataPayload = undefined;
  // The SAML payload should normally be present as HTTP POST parameter 'SAMLResponse'
  // In reality, since Chrome 62 this broke for certain users. Although not for everyone.
  // As a backup, the raw request body can be used to extract the SAML payload.
  if (details.requestBody.formData) {
    // Decode the base64 encoded SAML payload. This will get us the the SAML payload (which is XML)
    samlXmlDoc = decodeURIComponent(unescape(atob(details.requestBody.formData.SAMLResponse[0])));
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
    samlXmlDoc = decodeURIComponent(unescape(atob(formDataPayload.get('SAMLResponse'))))
  }
  if (DebugLogs) {
    console.log('DEBUG: samlXmlDoc:');
    console.log(samlXmlDoc);
  }

  // Convert XML to JS object
  options = {
    ignoreAttributes: false,
    attributeNamePrefix : "__"
  };
  parser = new XMLParser(options);
  jsObj = parser.parse(samlXmlDoc);
  // Get all attributes from the SAML Assertion
  attributes = jsObj["samlp:Response"].Assertion.AttributeStatement.Attribute
  // Loop through attributes to find the required ones
  for (let i in attributes) {
    if (attributes[i].__Name == "https://aws.amazon.com/SAML/Attributes/Role") {
      attributes_role_list = attributes[i].AttributeValue
    }
    if (attributes[i].__Name == "https://aws.amazon.com/SAML/Attributes/SessionDuration") {
      sessionduration = attributes[i].AttributeValue
    }
  }

  // Get the base64 encoded SAML Response from the IDP
  // and check if user provided a choice (roleIndex) for any of the roles
  let SAMLAssertion = undefined;
  let hasRoleIndex = false;
  let roleIndex = undefined;
  if (details.requestBody.formData) {
    SAMLAssertion = details.requestBody.formData.SAMLResponse[0];
    if ("roleIndex" in details.requestBody.formData) {
      hasRoleIndex = true;
      roleIndex = details.requestBody.formData.roleIndex[0];
    }
  } else if (formDataPayload) {
    SAMLAssertion = formDataPayload.get('SAMLResponse');
    roleIndex = formDataPayload.get('roleIndex');
    hasRoleIndex = roleIndex != undefined;
  }

  // Only set the SessionDuration if it was supplied by the SAML provider and 
  // when the user has configured to use this feature.
  if (sessionduration == undefined || !ApplySessionDuration) {
    sessionduration = null
  }

  // Change newline sequence when client is on Windows
  if (navigator.userAgent.indexOf('Windows')  !== -1) {
    LF = '\r\n'
  }

  if (DebugLogs) {
    console.log('ApplySessionDuration: ' + ApplySessionDuration);
    console.log('SessionDuration: ' + sessionduration);
    console.log('hasRoleIndex: ' + hasRoleIndex);
    console.log('roleIndex: ' + roleIndex);
    console.log('SAMLAssertion: ' + SAMLAssertion);
  }
  
   // If there is more than 1 role in the claim, look at the 'roleIndex' HTTP Form data parameter to determine the role to assume
  if (attributes_role_list.length > 1 && hasRoleIndex) {
    for (i = 0; i < attributes_role_list.length; i++) { 
      let attributes_role = attributes_role_list[i];
      if (attributes_role.indexOf(roleIndex) > -1) {
        // This attribute holdes the data for the role to assume. Use these details for the assumeRoleWithSAML API call
		    // The Role Attribute from the SAMLAssertion (DomNode) plus the SAMLAssertion itself is given as function arguments.
		    extractPrincipalPlusRoleAndAssumeRole(attributes_role, SAMLAssertion, sessionduration)
      }
    }
  }
  // If there is just 1 role in the claim there will be no 'roleIndex' in the form data.
  else if (attributes_role_list.length == undefined) {
    // When there is just 1 role in the claim, use these details for the assumeRoleWithSAML API call
	  // The Role Attribute from the SAMLAssertion (DomNode) plus the SAMLAssertion itself is given as function arguments.
    //
    // If there is just one role, the XMLParser does not create a list
    attributes_role = attributes_role_list
	  extractPrincipalPlusRoleAndAssumeRole(attributes_role, SAMLAssertion, sessionduration)
  }
}



// Called from 'onBeforeRequestEvent' function.
// Gets a Role Attribute from a SAMLAssertion as function argument. Gets the SAMLAssertion as a second argument.
// This function extracts the RoleArn and PrincipalArn (SAML-provider)
// from this argument and uses it to call the AWS STS assumeRoleWithSAML API.
function extractPrincipalPlusRoleAndAssumeRole(samlattribute, SAMLAssertion, SessionDuration) {
	// Pattern for Role
	let reRole = /arn:aws:iam:[^:]*:[0-9]+:role\/[^,]+/i;
	// Patern for Principal (SAML Provider)
	let rePrincipal = /arn:aws:iam:[^:]*:[0-9]+:saml-provider\/[^,]+/i;
	// Extraxt both regex patterns from SAMLAssertion attribute
	RoleArn = samlattribute.match(reRole)[0];
	PrincipalArn = samlattribute.match(rePrincipal)[0];
  
  if (DebugLogs) {
    console.log('RoleArn: ' + RoleArn);
    console.log('PrincipalArn: ' + PrincipalArn);
  }

	// Set parameters needed for assumeRoleWithSAML method
	let params = {
		PrincipalArn: PrincipalArn,
		RoleArn: RoleArn,
		SAMLAssertion: SAMLAssertion
	};
  if (SessionDuration !== null) {
    params['DurationSeconds'] = SessionDuration;
  }

	// Call STS API from AWS
  fetch('https://sts.amazonaws.com/?' + new URLSearchParams({
    Version: '2011-06-15',
    Action: 'AssumeRoleWithSAML',
    RoleArn: RoleArn,
    PrincipalArn: PrincipalArn,
    SAMLAssertion: SAMLAssertion
  }))
  .then(response => {
    if (response.ok) {
      return response.text();
    }
    throw new Error('Response from sts.amazonaws.com was not ok.')
  })
  .then(response => {
    // Response is XML. Convert XML to JS object
    parser = new XMLParser();
    jsObj = parser.parse(response);
    // On succesful API response create file with the STS keys
    let docContent = "[default]" + LF +
    "aws_access_key_id = " + jsObj.AssumeRoleWithSAMLResponse.AssumeRoleWithSAMLResult.Credentials.AccessKeyId + LF +
    "aws_secret_access_key = " + jsObj.AssumeRoleWithSAMLResponse.AssumeRoleWithSAMLResult.Credentials.SecretAccessKey + LF +
    "aws_session_token = " + jsObj.AssumeRoleWithSAMLResponse.AssumeRoleWithSAMLResult.Credentials.SessionToken;

    if (DebugLogs) {
      console.log('DEBUG: Successfully assumed default profile');
      console.log('docContent:');
      console.log(docContent);
    }

    // If there are no Role ARNs configured in the options panel, continue to create credentials file
    // Otherwise, extend docContent with a profile for each specified ARN in the options panel
    if (Object.keys(RoleArns).length == 0) {
      console.log('Generate AWS tokens file.');
      outputDocAsDownload(docContent);
    } else {
      if (DebugLogs) console.log('DEBUG: Additional Role ARNs are configured');
      let profileList = Object.keys(RoleArns);
      console.log('INFO: Do additional assume-role for role -> ' + RoleArns[profileList[0]]);
      // assumeAdditionalRole(profileList, 0, data.Credentials.AccessKeyId, data.Credentials.SecretAccessKey, data.Credentials.SessionToken, docContent, SessionDuration);
    }
  })
  .catch(error => console.log(error))
}


// Will fetch additional STS keys for 1 role from the RoleArns dict
// The assume-role API is called using the credentials (STS keys) fetched using the SAML claim. Basically the default profile.
function assumeAdditionalRole(profileList, index, AccessKeyId, SecretAccessKey, SessionToken, docContent, SessionDuration) {
	// Set the fetched STS keys from the SAML response as credentials for doing the API call
	let options = {'accessKeyId': AccessKeyId, 'secretAccessKey': SecretAccessKey, 'sessionToken': SessionToken};
	let sts = new AWS.STS(options);
	// Set the parameters for the AssumeRole API call. Meaning: What role to assume
	let params = {
		RoleArn: RoleArns[profileList[index]],
		RoleSessionName: profileList[index]
	};
  if (SessionDuration !== null) {
    params['DurationSeconds'] = SessionDuration;
  }

  if (DebugLogs) {
    console.log('RoleArn: ' + RoleArns[profileList[index]]);
    console.log('RoleSessionName: ' + profileList[index]);
  }

	// Call the API
	sts.assumeRole(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else {
			docContent += LF + LF +
			"[" + profileList[index] + "]" + LF +
			"aws_access_key_id = " + data.Credentials.AccessKeyId + LF +
			"aws_secret_access_key = " + data.Credentials.SecretAccessKey + LF +
      "aws_session_token = " + data.Credentials.SessionToken;
      
      if (DebugLogs) {
        console.log('DEBUG: Successfully assumed additional Role');
        console.log('docContent:');
        console.log(docContent);
      }
		}
		// If there are more profiles/roles in the RoleArns dict, do another call of assumeAdditionalRole to extend the docContent with another profile
		// Otherwise, this is the last profile/role in the RoleArns dict. Proceed to creating the credentials file
		if (index < profileList.length - 1) {
			console.log('INFO: Do additional assume-role for role -> ' + RoleArns[profileList[index + 1]]);
			assumeAdditionalRole(profileList, index + 1, AccessKeyId, SecretAccessKey, SessionToken, docContent);
		} else {
			outputDocAsDownload(docContent);
		}
	});
}



// Called from either extractPrincipalPlusRoleAndAssumeRole (if RoleArns dict is empty)
// Otherwise called from assumeAdditionalRole as soon as all roles from RoleArns have been assumed 
function outputDocAsDownload(docContent) {
  if (DebugLogs) {
    console.log('DEBUG: Now going to download credentials file. Document content:');
    console.log(docContent);
  }
  let doc = URL.createObjectURL( new Blob([docContent], {type: 'application/octet-binary'}) );
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
