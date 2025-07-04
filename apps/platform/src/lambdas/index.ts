import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { AppLambda } from './app-lambda';
import { Auth } from '../constructs/auth';

export interface LambdasProps {
  table: Table;
  auth: Auth;
}

export class Lambdas extends Construct {
  public readonly appLambda: AppLambda;

  public constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    this.appLambda = new AppLambda(this, 'AppLambda', {
      table: props.table,
      auth: props.auth,
    });
  }
}