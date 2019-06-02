const chalk = require('chalk');

module.exports = {
  ASSUME_ROLE_BEGIN: 'Attempting to assume role %s in account %s',

  ASSUME_ROLE_SUCCESS: chalk.green(
    'Successfully assumed role %s in account %s',
  ),
};
