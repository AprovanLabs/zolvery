import path from 'path';

import type { Environment } from './types';

export const ENVIRONMENT: Environment = (process.env.ENVIRONMENT ||
  'prd') as Environment;
export const ORG_ID = process.env.ORG_ID || 'aprovan';
export const PROJECT_ID = 'zolvery';

export const DOMAIN_PACKAGE = `com.${ORG_ID}.${PROJECT_ID}`;
export const PROJECT_DOMAIN = `${PROJECT_ID}.${ORG_ID}.com`;
export const DOMAIN_NAME = process.env.DOMAIN_NAME || PROJECT_DOMAIN;
export const MOBILE_PORT = process.env.MOBILE_PORT
  ? Number(process.env.MOBILE_PORT)
  : 4300;

type AwsRegion = 'us-east-1' | 'us-east-2' | 'us-west-1';
export const RegionShortCodeMap: Record<AwsRegion, string> = {
  'us-east-1': 'use1',
  'us-east-2': 'use2',
  'us-west-1': 'usw1',
};

export type RegionShortCode = keyof typeof RegionShortCodeMap | 'glb';

export const AWS_REGION = (process.env.AWS_REGION || 'us-east-2') as AwsRegion;
export const REGION_SHORT_CODE: RegionShortCode = RegionShortCodeMap[
  AWS_REGION
] as RegionShortCode;

const PLATFORM_ROOT = path.join(__dirname, '../..');
export const LAMBDAS_ROOT = path.join(PLATFORM_ROOT, 'handlers');
