import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { StringParameter, ParameterTier } from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { DOMAIN_NAME, ENVIRONMENT, ORG_ID, PROJECT_ID, REGION_SHORT_CODE } from '../core/constants';
import { Auth } from '../constructs/auth';
import { namer } from '../core/utils';

export interface AppLambdaProps {
  table: Table;
  auth: Auth;
}

export class AppLambda extends Construct {
  public readonly function: NodejsFunction;
  public readonly environmentVariables: StringParameter;

  public constructor(scope: Construct, id: string, props: AppLambdaProps) {
    super(scope, id);
    const environment = {
      NODE_ENV: 'production',
      TABLE_NAME: props.table.tableName,
      USER_POOL_ID: props.auth.cognitoUserPool.userPoolId,
      REGION_SHORT_CODE,
      ENVIRONMENT,
      PROJECT_ID,
      ORG_ID,
      PROJECT_DOMAIN: DOMAIN_NAME,
      COGNITO_USER_POOL_CLIENT_ID: props.auth.userPoolClient.userPoolClientId,
      COGNITO_USER_POOL_DOMAIN_NAME: props.auth.domainName,
    };

    this.environmentVariables = new StringParameter(
      this,
      'AppEnvironmentVariables',
      {
        parameterName: `/${ORG_ID}/${PROJECT_ID}/${REGION_SHORT_CODE}/${ENVIRONMENT}/app/env`,
        stringValue: Object.entries(environment)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n'),
        description: 'Environment variables for the app',
        tier: ParameterTier.STANDARD,
      }
    );
    

    const lambdaDir = path.join(__dirname, '../../../server');
    this.function = new NodejsFunction(this, 'AppFunction', {
      functionName: namer().regional('app'),
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(lambdaDir, 'src/app.ts'),
      handler: 'lambdaHandler',
      environment,
      timeout: Duration.seconds(30),
      memorySize: 512,
    });

    props.table.grantReadWriteData(this.function);
  }
}
