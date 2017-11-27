// Saves options to chrome.storage
function save_options() {
  // Get the filename to be saved
  var filename = $('#filename').val();

  // Get the Role_ARN's (Profile/ARNs pairs) entered by the user in the table
  var roles = {};

  // Iterate over all added profiles in the list
  $('#roles').find('.role').each(function() {

    var profile = $(this).find('[name=profile]').val();
    var arn = $(this).find('[name=arn]').val();

    if (profile && arn) {
      roles[profile] = arn;
    }
  });

  // Do the actual saving into Chrome storage
  chrome.storage.sync.set({
    FileName: filename,
    RoleArns: roles
  }, function() {
    // Show 'Options saved' message to let user know options were saved.
    $('#status').text('Options saved.').show().delay(1500).fadeOut();
  });

  // Notify background process of changed storage items.
  chrome.runtime.sendMessage({action: 'reloadStorageItems'}, function(response) {
    console.log(response.message);
  });
}

// Restores state using the preferences stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    // Default values
    FileName: 'credentials',
    RoleArns: {}
  }, function(items) {

    // Set filename
    $('#filename').val(items.FileName);

    // Create table header
    var tr = $('<tr>')
      .append($('<th>').text('Profile'))
      .append($('<th>').text('ARN of the role'))
      .append($('<th>')) // Delete button
      .append($('<th>')); // Add button

    $('#roles').append(tr);

    // Add a table row for each profile/ARN pair
    $.each(items.RoleArns, function(profile, arn) {
      add_table_row(profile, arn);
    });

    // Add a blank table row to easily add a new profile
    add_table_row(null, null);
  });
}

// Generate HTML for a table row of the roles table
function add_table_row(profile, arn) {
  // Create input fields for profile name and arn
  profile = $('<input>').attr('name', 'profile').attr('size', 18).val(profile);
  arn = $('<input>').attr('name', 'arn').attr('size', 55).val(arn);

  // Create add/delete buttons
  var del = $('<button>').text('DEL');
  var add = $('<button>').text('ADD');

  // Construct table row
  var tr = $('<tr>').addClass('role')
    .append($('<td>').append(profile))
    .append($('<td>').append(arn))
    .append($('<td>').append(del))
    .append($('<td>').append(add));

  // Add eventHandlers for the newly added buttons
  del.on('click', function() {
    tr.remove();
  });
  add.on('click', function() {
    add_table_row(null, null);
  });

  $('#roles').append(tr);
}

$(function(){
  restore_options();

  $('#save-button').click(function(){
    save_options();
  });
});
