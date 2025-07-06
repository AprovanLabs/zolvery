import { Construct } from 'constructs';
import {
  RemovalPolicy,
  Duration,
  aws_cloudfront_origins as origins,
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_apigateway as apigateway,
  aws_certificatemanager as certificatemanager,
  aws_route53 as route53,
  aws_route53_targets as targets,
} from 'aws-cdk-lib';
import { namer } from '../core/utils';

export interface WebProps {
  domainName: string;
  certificate: certificatemanager.ICertificate;
  hostedZoneId: string;
}

export class Web extends Construct {
  public readonly bucketName: string = namer({ universal: true }).regional('web');
  public readonly api: apigateway.RestApi;
  public readonly hostingBucket: s3.Bucket;
  public readonly url: string;
  public readonly apiArn: string;
  public readonly callbackUrl: string;
  public readonly logoutUrl: string;
  public readonly distribution: cloudfront.Distribution;

  public constructor(scope: Construct, id: string, props: WebProps) {
    super(scope, id);

    this.hostingBucket = new s3.Bucket(this, 'HostingBucket', {
      bucketName: this.bucketName,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE,
      publicReadAccess: false,
    });

    // const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
    //   comment: 'OAI for website',
    // });

    // this.hostingBucket.grantRead(originAccessIdentity);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(this.hostingBucket),
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: props.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(300),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(300),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cheapest
      httpVersion: cloudfront.HttpVersion.HTTP2,
    });

    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: namer().regional(),
      deploy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
      binaryMediaTypes: ['multipart/form-data'],
    });

    // const cloudfrontS3Access = new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
    //   resources: [this.hostingBucket.bucketArn, `${this.hostingBucket.bucketArn}/*`],
    //   principals: [originAccessIdentity.grantPrincipal],
    // });

    // this.hostingBucket.addToResourcePolicy(cloudfrontS3Access);

    this.url = `https://${props.domainName}`;
    this.apiArn = this.api.arnForExecuteApi();
    this.callbackUrl = this.url;
    this.logoutUrl = this.url;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: this.extractRootDomain(props.domainName),
    });

    new route53.ARecord(this, 'Route53Record', {
      zone: hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      comment: `Point ${props.domainName} to CloudFront distribution`,
    });
  }

  private extractRootDomain = (fullDomain: string): string => {
    const parts = fullDomain.split('.');
    return parts.slice(-2).join('.');
  };
}
