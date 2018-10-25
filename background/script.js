// Global variables
var filename, duration, roles;

// When this background process starts, load variables from chrome storage
// from saved Extension Options
load_items_from_storage();

// Additionaly on start of the background process it is checked if this extension can be activated
chrome.storage.sync.get({
  // The default is activated
  Activated: true
}, function(item) {
  if (item.Activated) {
    add_request_listener();
  }
});

// Additionaly on start of the background process it is checked if a new version of the plugin is installed.
// If so, show the user the changelog
// var thisVersion = chrome.runtime.getManifest().version;
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install' || details.reason === 'update') {
    // Open a new tab to show changelog html page
    chrome.tabs.create({url: '../options/changelog.html'});
  }
});

// Function to be called when this extension is activated.
// This adds an EventListener for each request to signin.aws.amazon.com
function add_request_listener() {
  if (chrome.webRequest.onBeforeRequest.hasListener(on_request_event)) {
    console.log('ERROR: onBeforeRequest EventListener could not be added, because onBeforeRequest already has an EventListener.');
  } else {
    chrome.webRequest.onBeforeRequest.addListener(
      on_request_event,
      {urls: ['https://signin.aws.amazon.com/saml']},
      ['requestBody']
    );
  }
}

// Function to be called when this extension is de-actived
// by unchecking the activation checkbox on the popup page
function remove_request_listener() {
  chrome.webRequest.onBeforeRequest.removeListener(on_request_event);
}

// Callback function for the webRequest OnBeforeRequest EventListener
// This function runs on each request to https://signin.aws.amazon.com/saml
function on_request_event(details) {
  var saml = extract_saml(details.requestBody);

  // Start out with a non-authenticated STS client
  var sts_client = new AWS.STS();

  // Assume role with SAML
  assume_base_role(sts_client, saml.attribute, saml.assertion).then(function(base_profile) {

    if (base_profile.credentials === null) {
      console.log('ERROR: unable to assume role from SAML')
      return
    }

    // Update STS client to use base credentials
    sts_client = new AWS.STS({
      accessKeyId: base_profile.credentials.AccessKeyId,
      secretAccessKey: base_profile.credentials.SecretAccessKey,
      sessionToken: base_profile.credentials.SessionToken
    });

    // Get credentials from all accounts
    var promises = $.map(roles, function(role_arn, profile_name) {
      return assume_additional_role(sts_client, role_arn, profile_name);
    });

    Promise.all(promises).then(function(profiles) {
      profiles.unshift(base_profile);
      download_file(profiles);
    });
  });
}

function extract_saml(request) {
  // Decode base64 SAML assertion in the request
  var saml_assertion;
  var has_role_index;
  var role_index;

  if (request.formData) {
    saml_assertion = request.formData.SAMLResponse[0];
    has_role_index = 'roleIndex' in request.formData;
    if (has_role_index) {
      role_index = request.formData.roleIndex[0];
    }
  } else if (request.raw) {
    var combined = new ArrayBuffer(0);
    request.raw.forEach(function(element) {
      var tmp = new Uint8Array(combined.byteLength + element.bytes.byteLength);
      tmp.set( new Uint8Array(combined), 0 );
      tmp.set( new Uint8Array(element.bytes),combined.byteLength );
      combined = tmp.buffer;
    });
    var view = new DataView(combined);
    var decoder = new TextDecoder('utf-8');
    var form_data = new URLSearchParams(decoder.decode(view));

    saml_assertion = form_data.get('SAMLResponse');
    role_index = form_data.get('roleIndex');
    has_role_index = role_index != undefined;
  }

  var saml_xml = decodeURIComponent(unescape(atob(saml_assertion)));

  // Convert XML String to DOM
  var parser = new DOMParser();
  // Get a list of claims (= AWS roles) from the SAML assertion
  var role_nodes = parser.parseFromString(saml_xml, 'text/xml')
    .querySelectorAll('[Name="https://aws.amazon.com/SAML/Attributes/Role"]')[0].childNodes;

  // If there is more than 1 role in the claim, look at the 'roleIndex' HTTP Form data parameter to determine the role to assume
  var saml_attribute;
  if (role_nodes.length > 1 && has_role_index) {
    for (var i = 0; i < role_nodes.length; i++) {
      var node_value = role_nodes[i].innerHTML;
      if (node_value.indexOf(role_index) > -1) {
        // This DomNode holdes the data for the role to assume. Use these details for the assumeRoleWithSAML API call
        // The Role Attribute from the SAMLAssertion (DomNode) plus the SAMLAssertion itself is given as function arguments.
        saml_attribute = node_value;
      }
    }
  }
  // If there is just 1 role in the claim there will be no 'roleIndex' in the form data.
  else if (role_nodes.length === 1) {
    // When there is just 1 role in the claim, use these details for the assumeRoleWithSAML API call
    // The Role Attribute from the SAMLAssertion (DomNode) plus the SAMLAssertion itself is given as function arguments.
    saml_attribute = role_nodes[0].innerHTML;
  }

  return {
    assertion: saml_assertion,
    attribute: saml_attribute
  };
}

// Called from 'on_request_event' function.
// Gets a Role Attribute from a SAMLAssertion as function argument. Gets the SAMLAssertion as a second argument.
// This function extracts the RoleArn and PrincipalArn (SAML-provider)
// from this argument and uses it to call the AWS STS assumeRoleWithSAML API.
function assume_base_role(sts_client, saml_attribute, saml_assertion) {
  // Extraxt both regex patterns from SAMLAssertion attribute
  var role_arn = saml_attribute.match(/arn:aws:iam:[^:]*:[0-9]+:role\/[^,]+/i)[0];
  var principal_arn = saml_attribute.match(/arn:aws:iam:[^:]*:[0-9]+:saml-provider\/[^,]+/i)[0];

  return new Promise(function(resolve, reject) {
    sts_client.assumeRoleWithSAML({
      PrincipalArn: principal_arn,
      RoleArn: role_arn,
      SAMLAssertion: saml_assertion,
      DurationSeconds: duration
    }, function(err, data) {
      if (err) {
        resolve({
          name: name,
          credentials: null
        });
      } else {
        resolve({
          name: 'default',
          credentials: data.Credentials
        });
      }
    });
  });
}

// Will fetch additional STS keys for 1 role from the RoleArns dict
// The assume-role API is called using the credentials (STS keys) fetched using the SAML claim. Basically the default profile.
function assume_additional_role(sts_client, role_arn, name) {
  // Set the parameters for the AssumeRole API call. Meaning: What role to assume
  return new Promise(function(resolve, reject) {
    sts_client.assumeRole({
      RoleArn: role_arn,
      RoleSessionName: 'samltoawsstskeys-' + name,
      DurationSeconds: duration
    }, function(err, data) {
      if (err) {
        resolve({
          name: name,
          credentials: null
        });
      } else {
        resolve({
          name: name,
          credentials: data.Credentials
        });
      }
    });
  });
}

function download_file(profiles) {
  // Convert list of profiles to a credentials file
  var content = $.map(profiles, function(profile) {
    if (profile.credentials === null) {
      return '# Invalid credentials for ' + profile.name;
    }
    return '[' + profile.name + '] \n' +
      'aws_access_key_id = ' + profile.credentials.AccessKeyId + ' \n' +
      'aws_secret_access_key = ' + profile.credentials.SecretAccessKey + ' \n' +
      'aws_session_token = ' + profile.credentials.SessionToken;
  }).join('\n\n');

  var blob = new Blob([content], {type: 'application/octet-binary'});
  var url = URL.createObjectURL(blob);
  // Triggers download of the generated file
  chrome.downloads.download({ url: url, filename: filename, conflictAction: 'overwrite', saveAs: false });
}

// This Listener receives messages from options.js and popup.js
// Received messages are meant to affect the background process.
chrome.runtime.onMessage.addListener(function(request, sender, send_response) {
  // When the options are changed in the Options panel
  // these items need to be reloaded in this background process.
  if (request.action === 'reloadStorageItems') {
    load_items_from_storage();
    send_response({message: 'Storage items reloaded in background process.'});
  }
  // When the activation checkbox on the popup screen is checked/unchecked
  // the webRequest event listener needs to be added or removed.
  if (request.action === 'addWebRequestEventListener') {
    add_request_listener();
    send_response({message: 'webRequest EventListener added in background process.'});
  }
  if (request.action === 'removeWebRequestEventListener') {
    remove_request_listener();
    send_response({message: 'webRequest EventListener removed in background process.'});
  }
});

function load_items_from_storage() {
  chrome.storage.sync.get({
    FileName: 'credentials',
    SessionDuration: 3600,
    RoleArns: {}
  }, function(items) {
    filename = items.FileName;
    duration = items.SessionDuration;
    roles = items.RoleArns;
  });
}
