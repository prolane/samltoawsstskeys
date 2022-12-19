const { STSClient, AssumeRoleCommand, AssumeRoleWithSAMLCommand } = require("@aws-sdk/client-sts");

export const AWSSTSClient = STSClient
export const AWSAssumeRoleCommand = AssumeRoleCommand
export const AWSAssumeRoleWithSAMLCommand = AssumeRoleWithSAMLCommand