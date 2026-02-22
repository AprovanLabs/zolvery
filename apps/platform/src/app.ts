#!/usr/bin/env node
import 'dotenv/config';

import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, Tags, CfnOutput } from 'aws-cdk-lib';
import { aws_certificatemanager as certificatemanager } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api, Web, Auth, Data } from './constructs';
import { DOMAIN_NAME, ENVIRONMENT, PROJECT_ID } from './core/constants';
import { Lambdas } from './lambdas';
import { namer } from './core/utils';

export class ZolveryStack extends Stack {
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const data = new Data(this, 'Data');

    const certificate = certificatemanager.Certificate.fromCertificateArn(
      this,
      'Certificate',
      process.env.CERTIFICATE_ARN!,
    );

    const web = new Web(this, 'Web', {
      hostedZoneId: process.env.HOSTED_ZONE_ID!,
      domainName: DOMAIN_NAME,
      certificate,
    });

    const auth = new Auth(this, 'Auth', {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: web.callbackUrl,
      logoutUrl: web.logoutUrl,
      domainName: DOMAIN_NAME,
      certificate,
    });

    const lambdas = new Lambdas(this, 'Lambdas', {
      table: data.table,
      auth,
    });

    new Api(this, 'Api', {
      data,
      api: web.api,
      cognitoUserPool: auth.cognitoUserPool,
      table: data.table,
      dataBucket: data.bucket,
      appLambdaFunction: lambdas.appLambda.function,
    });

    new CfnOutput(this, 'ApiUrl', { value: web.api.url });
    new CfnOutput(this, 'WebUrl', { value: web.url });
    new CfnOutput(this, 'UserPoolId', {
      value: auth.cognitoUserPool.userPoolId,
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, 'UserPoolDomainName', { value: auth.domainName });
  }
}

const app = new cdk.App();

const stack = new ZolveryStack(app, namer().regional(), {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

Tags.of(stack).add('project', PROJECT_ID);
Tags.of(stack).add('environment', ENVIRONMENT);

app.synth();
