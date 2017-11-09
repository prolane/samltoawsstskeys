# Changelog

## 2017-nov-01 (v2.1)
* Bug fix: Chrome 62 broke the extension. Special thanks for [Brice](https://github.com/bdruth) for contributing. Thanks to [Gijs](https://gitlab.com/gbvanrenswoude) for helping out with testing.

## 2016-nov-21 (v2.0)
* Added functionality to specify Role ARN's in the options panel. This is meant for cross-account assume-role API calls. For each specified role temporary credentials will be fetched and added to the credentials file.
* Updated 'AWS SDK for Javascript' library to latest version
* Plugin now shows changelog to the user after the installation of new version
* Options panel has a new look to improve readability
		
## 2016-jul-24 (v1.2)
* Bug fix: when just 1 role in the SAML Assertion available now also works well
* Now uses a regex to extract Role and Principal from SAML Assertion. This way it does not matter in what order the IDP adds the Role and Principle to the SAML Assertion.
		
## 2016-apr-11 (v1.1)
* Improved usability. No longer needed to manually specify PrincipalArn and RoleArn in options panel. Removed these options from the options panel. PrincipalArn and RoleArn is now parsed from the SAML Assertion itself.

## 2016-apr-04 (v1.0)
* Initial release