# SAML to AWS STS Keys Conversion
Google Chrome Extension which converts a SAML 2.0 assertion to AWS STS Keys (temporary credentials). Just log in to the AWS Web Management Console using your SAML IDP and the Chrome Extension will fetch the SAML Assertion from the HTTP request. The SAML Assertion is then used to call the assumeRoleWithSAML API to create the temporary credentials. (AccessKeyId, SecretAccessKey and SessionToken).

The Chrome Extension can be downloaded here:
[Google Chrome Web Store](https://chrome.google.com/webstore/detail/ekniobabpcnfjgfbphhcolcinmnbehde/)

# Table of Contents
* [Why this Chrome Extension?](#why)
* [Getting Started](#gettingstarted)
* [Create a link to your .aws/credentials file (for Windows users)](#winlink)
* [Create a link to your .aws credentials file (for Mac users)](#maclink)
* [Frequently Asked Question](#faq)

## <a name="why"></a>Why this Chrome Extension?
If you don't have any user administration setup within AWS Identity & Access Management (IAM) but instead rely on your corporate user directory, i.e. Microsoft Active Directory. Your company uses a SAML 2.0 Identity Provider (IDP) to log in to the AWS Web Management Console (Single Sign On). Then this Chrome Estension if for you!

You run into trouble as soon as you would like to execute some fancy scripts from your computer which calls the AWS API's. When sending a request to the AWS API's you need credentials, meaning an AccessKey and SecretKey. You can easily generate these keys for each user in AWS IAM. However, since you don't have any users in AWS IAM and don't want to create users just for the sake of having an AccessKey and SecretKey you are screwed. But there is a way to get temporary credentials specifically for your corporate identity.

The Security Token Service (STS) from AWS provides an API action assumeRoleWithSAML. Using the SAML Assertion given by your IDP the Chrome Extension will call this API action to fetch temporary credentials. (AccessKeyId, SecretAccessKey and SessionToken). This way there is no need to create some sort of anonymous user in AWS IAM used for executing scripts. This would be a real security nightmare, since it won't be possible to audit who did what. This Chrome Extension however will make it super easy for you to just use your corporate identity for executing scripts calling AWS API's.

## <a name="gettingstarted"></a>Getting Started
1. Install Plugin
1. Populate with Roles from your sub-accounts
1. Setup a link to your directory see [here](#winlink) or [here](#maclink)
1. Test connectivity using the aws cli ```aws s3 ls --profile <stsiamalias> ```

## Create a link to your .aws/credentials directory
### <a name="winlink"></a>Windows
del %UserProfile%\.aws\credentials
mklink %UserProfile%\.aws\credentials %UserProfile%\Downloads\credentials

### <a name="maclink"></a>Mac OSX
rm ~/.aws/credentials
ln -s ~/Downloads/credentials ~/.aws/credentials

## <a name="faq"></a>FAQ: Frequently Asked Question
1. Why can I not save file somewhere else?
TA quicker way to get the full latest list is to open Chrome > Console and hit document.extraRoles.   Their full list can be easily downloaded for you to use within your own STS plugin. ODO
1. How long are the credentials valid?
AWS only allow the STS temporary credentials for up to 2 hours.  
