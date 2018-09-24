# SAML to AWS STS Keys Conversion
Google Chrome Extension which converts a SAML 2.0 assertion to AWS STS Keys (temporary credentials). Just log in to the AWS Web Management Console using your SAML IDP and the Chrome Extension will fetch the SAML Assertion from the HTTP request. The SAML Assertion is then used to call the assumeRoleWithSAML API to create the temporary credentials. (AccessKeyId, SecretAccessKey and SessionToken).

Now for Firefox!
[Saml-to-AWS-STS Keys Conversion Releases](https://chrome.google.com/webstore/detail/ekniobabpcnfjgfbphhcolcinmnbehde/)
