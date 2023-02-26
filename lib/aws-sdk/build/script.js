const { STSClient, AssumeRoleCommand, AssumeRoleWithSAMLCommand, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

export const AWSSTSClient = STSClient
export const AWSAssumeRoleCommand = AssumeRoleCommand
export const AWSAssumeRoleWithSAMLCommand = AssumeRoleWithSAMLCommand
export const AWSGetCallerIdentityCommand = GetCallerIdentityCommand
