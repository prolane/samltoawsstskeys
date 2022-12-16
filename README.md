# SAML to AWS STS Keys Conversion
Google Chrome Extension which converts a SAML 2.0 assertion to AWS STS Keys (temporary credentials). Just log in to the AWS Web Management Console using your SAML IDP and the Chrome Extension will fetch the SAML Assertion from the HTTP request. The SAML Assertion is then used to call the assumeRoleWithSAML API to create the temporary credentials. (AccessKeyId, SecretAccessKey and SessionToken).

The Chrome Extension can be downloaded here:
[Google Chrome Web Store](https://chrome.google.com/webstore/detail/ekniobabpcnfjgfbphhcolcinmnbehde/)

> The source of this extension is also used as [extension](https://addons.mozilla.org/en-US/firefox/addon/saml-to-aws-sts-keys/) for Mozilla FireFox. For specific FireFox related questions you can get in touch with my awesome friend @gbvanrenswoude.

# Table of Contents
* [Why this Chrome Extension?](#why)
* [Getting Started](#gettingstarted)
* [Create a symlink to your .aws directory (for Windows users)](#symlink)
* [Plugin Development Notes](#development)
* [Frequently Asked Question](#faq)

## <a name="why"></a>Why this Chrome Extension?
If you don't have any user administration setup within AWS Identity & Access Management (IAM) but instead rely on your corporate user directory, i.e. Microsoft Active Directory. Your company uses a SAML 2.0 Identity Provider (IDP) to log in to the AWS Web Management Console (Single Sign On). Then this Chrome Estension if for you!

You run into trouble as soon as you would like to execute some fancy scripts from your computer which calls the AWS API's. When sending a request to the AWS API's you need credentials, meaning an AccessKey and SecretKey. You can easily generate these keys for each user in AWS IAM. However, since you don't have any users in AWS IAM and don't want to create users just for the sake of having an AccessKey and SecretKey you are screwed. But there is a way to get temporary credentials specifically for your corporate identity.

The Security Token Service (STS) from AWS provides an API action assumeRoleWithSAML. Using the SAML Assertion given by your IDP the Chrome Extension will call this API action to fetch temporary credentials. (AccessKeyId, SecretAccessKey and SessionToken). This way there is no need to create some sort of anonymous user in AWS IAM used for executing scripts. This would be a real security nightmare, since it won't be possible to audit who did what. This Chrome Extension however will make it super easy for you to just use your corporate identity for executing scripts calling AWS API's.

## <a name="gettingstarted"></a>Getting Started
TODO

## <a name="symlink"></a>Create a symlink to your .aws directory (for Windows users)
TODO

## <a name="development"></a>Plugin Development Notes
Here are some important notes for development of this plugin.

### AWS SDK with webpack
The AWS SDK for Javascript is packaged with webpack. npm and webpack configuration is located in `lib/aws-sdk/build`.

To install a specific version of an AWS SDK module, go into the build directory and run:
```
npm install --save --save-exact @aws-sdk/client-sts@3.209.0
```

To simply install the required node modules and build the sdk library required for the plugin:
```
npm install
npm run build
```

## <a name="faq"></a>FAQ: Frequently Asked Question
1. How to check for errors in the extension?
    * Go to the options page of the extension
    * Set 'Enable DEBUG logs' to 'yes' and hit the 'Save' button below
    * Go to the Chrome Extensions page and look for the 'SAML to AWS STS Keys Conversion' extension
    * Click on the link where it says 'Inspect views'
    * A new Chrome DevTools window should pop up, with the 'Console' tab already selected. This is where you'll be able to view all logs.
    * Perform a new login and check the logs to see if there are any errors.

2. Why can I not save the credentials file somewhere else?
With security in mind Google has limited the Chrome browser to only read and write to the Chrome Downloads directory. This way none of your Chrome extension will be able to steal data from your computer.

3. How long are the credentials valid?
AWS calls this 'session duration'. The default session duration is 1 hour. The maximum session duration is configured in AWS IAM as an attribute of the IAM Role. Your IDP might be configured to pass along an additional SAML claim which requests to apply a custom session duration. This value can be configured to be higher than the default of 1 hour. However, this can never be higher than the configured maximum session duration on the IAM Role as this will result in an error.
