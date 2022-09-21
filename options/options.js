// Saves options to chrome.storage
function save_options() {
  // Get the filename to be saved
  var FileName = document.getElementById('FileName').value;

  // Does SessionDuration needs to be applied?
	var ApplySessionDuration = $("#SessionDuration option:selected").val();
	
	// Is DEBUG log enabled?
  var DebugLogs = $("#DebugLogs option:selected").val();

  // Does AssumeAllRoles needs to be applied?
  var AssumeAllRoles = $("#AssumeAllRoles option:selected").val();


  // Get the Role_ARN's (Profile/ARNs pairs) entered by the user in the table
  var RoleArns = {};

  // Iterate over all added profiles in the list
  $("input[id^='profile_']").each(function( index ) {
	  // Replace profile_<rowId> for arn_<rowId> to be able to get value of corresponding arn input field
	  var input_id_arn = $(this).attr('id').replace("profile", "arn");

	  // Create key-value pair to add to RoleArns dictionary.
	  // Only add it to the dict if both profile and arn are not an empty string
	  if ($(this).val() != '' && $('#' + input_id_arn).val() != '') {
		  RoleArns[$(this).val()] = $('#' + input_id_arn).val();
	  }
  });


  // Get the Account Aliases entered by the user in the table
  const AccountAliases = Array
                         .from(document.querySelectorAll('table#aliases tr'))
                         .filter(e => e.querySelectorAll('input').length > 0)
                         .map((e => ({
                           AccountNumber: e.querySelectorAll('.account')[0]
                                           .value,

                           Alias:         e.querySelectorAll('.alias')[0]
                                           .value,
                         })))
                         .filter(x => x.AccountNumber && x.Alias)
                         .reduce((acc, aliasSet) => acc.concat(aliasSet), []);


  // Do the actual saving into Chrome storage
  chrome.storage.sync.set({
    FileName: FileName,
    ApplySessionDuration: ApplySessionDuration,
    AssumeAllRoles,
    RoleArns: RoleArns,
    AccountAliases,
	DebugLogs: DebugLogs,
  }, function() {
    // Show 'Options saved' message to let user know options were saved.
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
  chrome.storage.sync.get({
	  // Default values
    FileName: 'credentials',
    ApplySessionDuration: 'yes',
    AssumeAllRoles: 'yes',
    RoleArns: {},
    AccountAliases: [],
	DebugLogs: 'no',
  }, function(items) {
	// Set filename
    document.getElementById('FileName').value = items.FileName;

    // Set ApplySessionDuration
    $("#SessionDuration").val(items.ApplySessionDuration);

    // Set AssumeAllRoles
    $("#SessionDuration").val(items.AssumeAllRoles);

	// Set DebugLogs
    $("#DebugLogs").val(items.DebugLogs);
	// Set the html for the Role ARN's Table
	$("#role_arns").html('<table><tr id="tr_header_rolearns"><th>Profile</th><th>ARN of the role</th><th></th><th></th></tr></table>');

	// Set the html for the Account Aliases Table
	$("#account_aliases").html('<table id="aliases"><tr id="tr_header_aliases"><th>Alias</th><th>Account Number</th><th></th><th></th></tr></table>');

	// For each key/value pair add table row
	for (var profile in items.RoleArns){
		if (items.RoleArns.hasOwnProperty(profile)) {
			addTableRow('#tr_header_rolearns', profile, items.RoleArns[profile], 'profile', 'arn');
		}
	}

  // Add Account Aliases to table
  items.AccountAliases.map(aliasSet => addTableRow(
                                                    '#tr_header_aliases',
                                                    aliasSet.Alias,
                                                    aliasSet.AccountNumber,
                                                    'alias',
                                                    'account',
                                                  ));


	// Add a blank table row if there are now current entries
  // (So the user can easily add a new key/value pair)
	if (Object.keys(items.RoleArns).length == 0) {
		addTableRow('#role_arns table tr:last', null, null, 'profile', 'arn');
	}

	if (Object.keys(items.AccountAliases).length == 0) {
		addTableRow(
                 '#account_aliases table tr:last',
                 null,
                 null,
                 'alias',
                 'account'
               );
	}
  });
}


// Add a blank table row for the user to add a new key/value pair
function addTableRow(previousRowJquerySelector, key, value, keyName, valName) {
	// Generate random identifier for the to be added row
	var newRowId = randomId();
	$(previousRowJquerySelector).after(getTableRowHtml(
                                                      newRowId,
                                                      key,
                                                      value,
                                                      keyName,
                                                      valName,
                                                    ));

	// Add eventHandlers for the newly added buttons
	$('#btn_add_' + newRowId).on("click", function() {
		addTableRow('#tr_' + newRowId, null, null, keyName, valName);
	});
	$('#btn_del_' + newRowId).on("click", function() {
		delTableRow('#tr_' + newRowId);
	});
}


// Remove table row
function delTableRow(tableRowJquerySelector) {
	// Remove table row from the DOM including bound events
	$(tableRowJquerySelector).remove();
}


// Generate HTML for a table row of a key/value table
function getTableRowHtml(tableRowId, key, value, keyName, valName) {
	var keyValue = '';
	var valueValue = '';

	// If key and value are not NULL, generate HTML value attribute
	if (key) { keyValue = 'value="' + key + '"' };
	if (value) { valueValue = 'value="' + value + '"' };

	// Generate HTML for the row
	var html =	'<tr id="tr_' + keyName + '_' + tableRowId + '">\
				<th><input type="text" id="' + keyName + '_' + tableRowId + '" class="' + keyName + '" size="18" ' + keyValue + '></th> \
				<th><input type="text" id="' + valName + '_' + tableRowId + '" class="' + valName + '"  size="55" ' + valueValue + '></th> \
				<th><button id="btn_del_' + tableRowId + '">DEL</button></th> \
				<th><button id="btn_add_' + tableRowId + '">ADD</button></th> \
				</tr>';
	return html;
}


function randomId() {
	return Math.random().toString(36).substr(2, 8);
}


document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
