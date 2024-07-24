const { STSClient, AssumeRoleCommand, AssumeRoleWithSAMLCommand } = require("@aws-sdk/client-sts");

export const AWSSTSClient = STSClient
export const AWSAssumeRoleCommand = AssumeRoleCommand
export const AWSAssumeRoleWithSAMLCommand = AssumeRoleWithSAMLCommand

const ini = require("ini");
export const IniLib = ini