# Changelog

## 2023-mar-20 (v3.3)
* Option to set custom Session Duration

## 2022-dec-19 (v3.2)
* Fix [#61](https://github.com/prolane/samltoawsstskeys/issues/61). Instead of using the aws http api directly for AssumeRoleWithSAML, this version switches to using the aws sdk. This is to fix processing large SAML Assertions.
* Fix [#62](https://github.com/prolane/samltoawsstskeys/issues/62). When the IDP does not add a Session Duration as SAML Assertion Attribute, ignore and continue.

## 2022-dec-16 (v3.1)
* Fix [#58](https://github.com/prolane/samltoawsstskeys/issues/58). Parse various SAML Assertion AttributeValue syntax in a consistent way.

## 2022-dec-15 (v3.0)
* Code refactoring due to upgrading to Extension Manifest V3
* Improved popup styling
* LCM on dependency libs

## 2022-jun-29 (v2.8)
* At request of Google, the "tabs" permission is removed.

## 2019-feb-8 (v2.7)
* Changed permissions. The extension will now ask access to any requested URL. This is needed because of changed policy in Chrome 72 for the chrome.webRequest API. Read [here](https://github.com/prolane/samltoawsstskeys/issues/28#issuecomment-461938267) for the rationale behind it. Fixes [#28](https://github.com/prolane/samltoawsstskeys/issues/28).

## 2019-feb-7 (v2.6)
* Adds the option to enable debug logs

## 2018-nov-15 (v2.5)
* Implements CRLF as newlines in the credentials file when the client is on Windows. Fixes [#21](https://github.com/prolane/samltoawsstskeys/issues/21)
* Removes unnecessary spaces prior the newlines in credentials file. Fixes [#14](https://github.com/prolane/samltoawsstskeys/issues/14)

## 2018-aug-2 (v2.4)
* Bug fix for users with one IAM role in the SAML claim. Bug was introduced with release 2.1, but according to user reports only results in an error starting with Chrome release 68.

## 2018-may-14 (v2.3)
* Release 2.2 revealed many users have their SAML provider requesting a SessionDuration which is higher than the maximum session duration configured at the IAM Role. Release 2.3 now supports manually enabling or disabling this SessionDuration feature. The feature is enabled by default, but can be disabled in the options.

## 2018-may-12 (v2.2)
* Now supports the SessionDuration SAML attribute which can be set by your IDP administrator. This can keep your credentials valid longer than the default 1 hour. Thanks to [Jeroen](https://github.com/ashemedai) for his contribution!

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