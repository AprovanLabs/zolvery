import { S3Client } from '@aws-sdk/client-s3';
import { appConfig } from '@/config';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const config: any = {
      region: appConfig.aws.region,
    };

    // Configure for LocalStack
    if (appConfig.aws.endpoint) {
      config.endpoint = appConfig.aws.endpoint;
      config.forcePathStyle = true;
      config.tls = false;
    }

    // Add credentials if provided
    if (appConfig.aws.accessKeyId && appConfig.aws.secretAccessKey) {
      config.credentials = {
        accessKeyId: appConfig.aws.accessKeyId,
        secretAccessKey: appConfig.aws.secretAccessKey,
      };
    }

    s3Client = new S3Client(config);
  }

  return s3Client;
}
