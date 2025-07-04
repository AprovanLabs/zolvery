import { Construct } from 'constructs';
import {
  Duration,
  RemovalPolicy,
  Stack,
  aws_athena as athena,
  aws_dynamodb as dynamodb,
  aws_glue as glue,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import { namer } from '../core/utils';

export class Data extends Construct {
  public readonly bucketName: string = namer().universal();
  public readonly databaseName: string = namer({ database: true }).regional('lake');
  public readonly tableName: string = namer().regional();
  public readonly athenaS3Prefix: string = 'athena';
  public readonly athenaWorkgroup: athena.CfnWorkGroup;
  public readonly athenaOutputLocation: string;
  public readonly glueDatabase: glue.CfnDatabase;
  public readonly bucket: s3.Bucket;
  public readonly table: dynamodb.Table;

  public constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = Stack.of(this);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: this.tableName,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      readCapacity: 1,
      writeCapacity: 1,
    });


    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI',
      projectionType: dynamodb.ProjectionType.ALL,
      partitionKey: {
        name: 'GSI',
        type: dynamodb.AttributeType.NUMBER,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
    });

    this.bucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: namer({ universal: true }).regional('data'),
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      publicReadAccess: false,
    });

    this.glueDatabase = new glue.CfnDatabase(this, 'LakeDatabase', {
      databaseName: this.databaseName,
      catalogId: stack.account,
      databaseInput: {
        name: this.databaseName,
        description: 'Kossabos data lake catalog',
      },
    });

    this.athenaOutputLocation = `s3://${this.bucket.bucketName}/${this.athenaS3Prefix}`;

    this.athenaWorkgroup = new athena.CfnWorkGroup(this, 'WorkGroup', {
      name: namer({ database: true }).regional(),
      state: 'ENABLED',
      recursiveDeleteOption: true,
      workGroupConfiguration: {
        bytesScannedCutoffPerQuery: 2147483647,
        resultConfiguration: {
          outputLocation: this.athenaOutputLocation,
        },
      },
    });

    // Expire Athena output after 1 day
    this.bucket.addLifecycleRule({
      expiration: Duration.days(1),
      prefix: this.athenaS3Prefix,
    });
  }
}
