/**
 * AWS CLI client
 * Provides typed access to AWS CLI commands
 */

import { createCliClient, type CliClientProxy } from '../core/cli';

/**
 * AWS S3 commands
 */
export interface AwsS3Commands {
  ls: (
    path?: string,
    args?: { recursive?: boolean; humanReadable?: boolean },
  ) => Promise<string>;
  cp: (
    source: string,
    dest: string,
    args?: { recursive?: boolean; exclude?: string; include?: string },
  ) => Promise<string>;
  mv: (
    source: string,
    dest: string,
    args?: { recursive?: boolean },
  ) => Promise<string>;
  rm: (path: string, args?: { recursive?: boolean }) => Promise<string>;
  sync: (
    source: string,
    dest: string,
    args?: { delete?: boolean; exclude?: string },
  ) => Promise<string>;
  mb: (bucket: string) => Promise<string>;
  rb: (bucket: string, args?: { force?: boolean }) => Promise<string>;
  presign: (path: string, args?: { expiresIn?: number }) => Promise<string>;
}

/**
 * AWS EC2 commands
 */
export interface AwsEc2Commands {
  describeInstances: (args?: {
    instanceIds?: string[];
    filters?: string;
    query?: string;
  }) => Promise<string>;
  startInstances: (instanceIds: string[]) => Promise<string>;
  stopInstances: (instanceIds: string[]) => Promise<string>;
  terminateInstances: (instanceIds: string[]) => Promise<string>;
  describeSecurityGroups: (args?: { groupIds?: string[] }) => Promise<string>;
  describeVpcs: (args?: { vpcIds?: string[] }) => Promise<string>;
  describeSubnets: (args?: { subnetIds?: string[] }) => Promise<string>;
}

/**
 * AWS Lambda commands
 */
export interface AwsLambdaCommands {
  listFunctions: (args?: { maxItems?: number }) => Promise<string>;
  invoke: (
    functionName: string,
    args?: { payload?: string; logType?: 'None' | 'Tail' },
  ) => Promise<string>;
  getFunction: (functionName: string) => Promise<string>;
  updateFunctionCode: (
    functionName: string,
    args?: { s3Bucket?: string; s3Key?: string; zipFile?: string },
  ) => Promise<string>;
}

/**
 * AWS DynamoDB commands
 */
export interface AwsDynamodbCommands {
  listTables: () => Promise<string>;
  describeTable: (tableName: string) => Promise<string>;
  scan: (
    tableName: string,
    args?: { maxItems?: number; filterExpression?: string },
  ) => Promise<string>;
  getItem: (tableName: string, key: string) => Promise<string>;
  putItem: (tableName: string, item: string) => Promise<string>;
  deleteItem: (tableName: string, key: string) => Promise<string>;
  query: (
    tableName: string,
    args?: { keyConditionExpression?: string },
  ) => Promise<string>;
}

/**
 * AWS IAM commands
 */
export interface AwsIamCommands {
  listUsers: () => Promise<string>;
  listRoles: () => Promise<string>;
  listPolicies: (args?: { scope?: 'Local' | 'AWS' | 'All' }) => Promise<string>;
  getUser: (userName?: string) => Promise<string>;
  getRole: (roleName: string) => Promise<string>;
}

/**
 * AWS CloudFormation commands
 */
export interface AwsCloudformationCommands {
  listStacks: (args?: { stackStatusFilter?: string[] }) => Promise<string>;
  describeStacks: (args?: { stackName?: string }) => Promise<string>;
  createStack: (
    stackName: string,
    args?: { templateBody?: string; templateUrl?: string },
  ) => Promise<string>;
  updateStack: (
    stackName: string,
    args?: { templateBody?: string; templateUrl?: string },
  ) => Promise<string>;
  deleteStack: (stackName: string) => Promise<string>;
}

/**
 * AWS STS commands
 */
export interface AwsStsCommands {
  getCallerIdentity: () => Promise<string>;
  assumeRole: (
    roleArn: string,
    args?: { roleSessionName?: string },
  ) => Promise<string>;
}

/**
 * AWS SSM commands
 */
export interface AwsSsmCommands {
  getParameter: (
    name: string,
    args?: { withDecryption?: boolean },
  ) => Promise<string>;
  getParameters: (
    names: string[],
    args?: { withDecryption?: boolean },
  ) => Promise<string>;
  putParameter: (
    name: string,
    args?: { value?: string; type?: string; overwrite?: boolean },
  ) => Promise<string>;
  getParametersByPath: (
    path: string,
    args?: { recursive?: boolean; withDecryption?: boolean },
  ) => Promise<string>;
}

/**
 * AWS Logs commands
 */
export interface AwsLogsCommands {
  describeLogGroups: (args?: {
    logGroupNamePrefix?: string;
  }) => Promise<string>;
  describeLogStreams: (
    logGroupName: string,
    args?: { logStreamNamePrefix?: string },
  ) => Promise<string>;
  getLogEvents: (
    logGroupName: string,
    logStreamName: string,
    args?: { limit?: number },
  ) => Promise<string>;
  filterLogEvents: (
    logGroupName: string,
    args?: { filterPattern?: string; limit?: number },
  ) => Promise<string>;
}

/**
 * AWS CLI client interface
 */
export interface AwsClient {
  s3: AwsS3Commands & CliClientProxy;
  ec2: AwsEc2Commands & CliClientProxy;
  lambda: AwsLambdaCommands & CliClientProxy;
  dynamodb: AwsDynamodbCommands & CliClientProxy;
  iam: AwsIamCommands & CliClientProxy;
  cloudformation: AwsCloudformationCommands & CliClientProxy;
  sts: AwsStsCommands & CliClientProxy;
  ssm: AwsSsmCommands & CliClientProxy;
  logs: AwsLogsCommands & CliClientProxy;
  /** Access any aws subcommand dynamically */
  [key: string]: CliClientProxy;
}

/**
 * Pre-configured AWS CLI client
 *
 * @example
 * // aws s3 ls
 * const buckets = await aws.s3.ls();
 *
 * // aws s3 cp file.txt s3://bucket/file.txt
 * await aws.s3.cp('file.txt', 's3://bucket/file.txt');
 *
 * // aws lambda list-functions
 * const functions = await aws.lambda.listFunctions();
 *
 * // aws sts get-caller-identity
 * const identity = await aws.sts.getCallerIdentity();
 */
export const aws = createCliClient({
  command: 'aws',
  argOptions: {
    kebabCase: true,
  },
}) as unknown as AwsClient;

/**
 * Get an AWS CLI client instance
 * @returns AWS client (CLI clients are stateless, returns the singleton)
 */
export const getClient = (): AwsClient => aws;

export default aws;
