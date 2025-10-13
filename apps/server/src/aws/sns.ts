import { SNSClient } from '@aws-sdk/client-sns';
import { appConfig } from '@/config';

let snsClient: SNSClient | null = null;

export function getSNSClient(): SNSClient {
  if (!snsClient) {
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

    snsClient = new SNSClient(config);
  }

  return snsClient;
}
