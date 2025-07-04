import { Construct } from 'constructs';
import {
  Stack,
  aws_apigateway as apigateway,
  aws_lambda as lambda,
  aws_cognito as cognito,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Data } from './data';
import { namer } from '../core/utils';

const basicMethodResponses: apigateway.MethodResponse[] = [
  {
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': true,
      'method.response.header.Access-Control-Allow-Methods': true,
      'method.response.header.Access-Control-Allow-Origin': true,
    },
  },
  { statusCode: '400' },
];

export interface ApiProps {
  data: Data;
  api: apigateway.RestApi;
  cognitoUserPool: cognito.UserPool;
  table: dynamodb.Table;
  dataBucket: s3.Bucket;
  imageName?: string;
  appLambdaFunction: lambda.IFunction;
}

export class Api extends Construct {
  public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;

  public constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const stack = Stack.of(this);

    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'Authorizer',
      {
        authorizerName: namer().regional(),
        cognitoUserPools: [props.cognitoUserPool],
      },
    );

    // Add Athena permissions
    props.appLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'athena:StartQueryExecution',
          'athena:StopQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:GetDatabase',
          'athena:GetWorkGroup',
        ],
        resources: [
          `arn:aws:athena:${stack.region}:${stack.account}:workgroup/${props.data.athenaWorkgroup.ref}`,
        ],
      }),
    );

    props.appLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:ListMultipartUploadParts',
          's3:PutObject',
          's3:AbortMultipartUpload',
        ],
        resources: [
          `arn:aws:s3:::${props.data.athenaOutputLocation.split('/')[0]}`,
          `arn:aws:s3:::${props.data.athenaOutputLocation}`,
          `arn:aws:s3:::${props.data.athenaOutputLocation}/*`,
        ],
      }),
    );

    props.appLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'glue:GetDatabase',
          'glue:GetTable',
          'glue:GetTableVersion',
          'glue:GetTableVersions',
          'glue:GetPartitions',
          'glue:CreateTable',
          'glue:DeleteTable',
          'lambda:InvokeFunction',
          'athena:GetDataCatalog',
        ],
        resources: [
          `arn:aws:glue:${stack.region}:${stack.account}:catalog`,
          `arn:aws:glue:${stack.region}:${stack.account}:database/${props.data.databaseName}`,
          `arn:aws:glue:${stack.region}:${stack.account}:database/${props.data.databaseName}_dynamodb`,
          `arn:aws:glue:${stack.region}:${stack.account}:table/*/*`,
          `arn:aws:lambda:${stack.region}:${stack.account}:function:${props.data.databaseName}_dynamodb`,
          `arn:aws:athena:${stack.region}:${stack.account}:datacatalog/${props.data.databaseName}_dynamodb`,
        ],
      }),
    );

    props.appLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:GetGroup',
          'cognito-idp:AdminAddUserToGroup',
        ],
        resources: [
          `arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${props.cognitoUserPool.userPoolId}`,
        ],
      }),
    );

    const appLambdaIntegration = new apigateway.LambdaIntegration(
      props.appLambdaFunction,
      { proxy: true },
    );

    const v1Resource = props.api.root.addResource('v1');

    this.addMethods({
      resource: v1Resource.addResource('public').addResource('{proxy+}'),
      integration: appLambdaIntegration,
    });
    this.addMethods({
      resource: v1Resource.addResource('protected').addResource('{proxy+}'),
      integration: appLambdaIntegration,
      options: {
        authorizer: this.authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      },
    });

    // Basic rate throttling
    props.api.addUsagePlan('UsagePlan', {
      name: 'Basic',
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
    });
  }

  private addMethods({
    resource,
    integration,
    httpMethods = ['ANY'],
    options,
  }: {
    resource: apigateway.Resource;
    integration: apigateway.Integration;
    httpMethods?: string[];
    options?: {
      authorizer?: apigateway.IAuthorizer;
      authorizationType?: apigateway.AuthorizationType;
    };
  }): void {
    if (!resource || !integration) {
      throw new Error('Resource and integration must be provided');
    }

    httpMethods.forEach((httpMethod) => {
      resource.addMethod(httpMethod, integration, {
        methodResponses: basicMethodResponses,
        authorizer: options?.authorizer,
        authorizationType: options?.authorizationType,
      });
    });
  }
}
