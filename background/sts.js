const { sprintf } = require('printj');
const fmt         = require('./fmt.js');

module.exports = {

  assumeRole: async (config, logger, STS, roleAttributeValue, SAMLAssertion) => {
    const rePrincipal      = /arn:aws:iam:[^:]*:[0-9]+:saml-provider\/[^,]+/i;
    const reRole           = /arn:aws:iam:[^:]*:([0-9]+):role\/([^,]+)/i;
    const principalMatches = roleAttributeValue.match(rePrincipal);
    const roleMatches      = roleAttributeValue.match(reRole);
    const accountNumber    = roleMatches[1];
    const roleName         = roleMatches[2];

    const params = {
                     PrincipalArn: principalMatches[0],
                     RoleArn:      roleMatches[0],
                     SAMLAssertion,
                   };

    // Get the alias of the account if it exists.
    // Otherwise, use the account number.
    // TODO: It may make sense to extract this into a function.
    const roleAccount = (
                          config.AccountAliases
                          && config.AccountAliases
                                   .filter(
                                     x => x.AccountNumber
                                     === accountNumber,
                                   )
                                   .reduce((acc, alias) => alias.Alias, null)
                        )
                        || accountNumber;

    try
    {
      logger.info(sprintf(fmt.ASSUME_ROLE_BEGIN, roleName, roleAccount));
      const response = await STS.assumeRoleWithSAML(params).promise();
      logger.info(sprintf(fmt.ASSUME_ROLE_SUCCESS, roleName, roleAccount));

      return {
               accountNumber,
               roleName,
               credentials: response.Credentials,
             };
    }
    catch (e)
    {
      logger.error(e.message);
      logger.debug(e.stack);
      return null;
    }
  },
};
