const { STSClient, AssumeRoleCommand } = require("@aws-sdk/client-sts");

export const AWSSTSClient = STSClient
export const AWSAssumeRoleCommand = AssumeRoleCommand