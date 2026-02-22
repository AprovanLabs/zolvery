import { Construct } from 'constructs';
import {
  Stack,
  Duration,
  RemovalPolicy,
  aws_cognito as cognito,
  aws_certificatemanager as certificatemanager,
} from 'aws-cdk-lib';
import { DOMAIN_PACKAGE, MOBILE_PORT, PROJECT_DOMAIN } from '../core/constants';
import { namer } from '../core/utils';

export interface AuthProps {
  callbackUrl: string;
  logoutUrl: string;
  domainName: string;
  certificate: certificatemanager.ICertificate;
  googleClientId?: string;
  googleClientSecret?: string;
}

export class Auth extends Construct {
  public readonly cognitoUserPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly signInUrl: string;
  public readonly domainName: string;

  public constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    const stack = Stack.of(this);

    this.cognitoUserPool = new cognito.UserPool(this, 'Pool', {
      removalPolicy: RemovalPolicy.DESTROY,
      userPoolName: namer().regional(),
      customAttributes: {
        account_type: new cognito.StringAttribute({
          minLen: 1,
          mutable: true,
        }),
      },
      signInAliases: {
        username: false,
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Verify Your Email for Zolvery',
        emailBody: `Thanks for signing up for Zolvery! Verify account by clicking on {##Verify Email##}`,
        emailStyle: cognito.VerificationEmailStyle.LINK,
      },
      userInvitation: {
        emailSubject: 'Invite to Join Zolvery',
        emailBody: `Hello {username},

You've been invited to join Zolvery! Your temporary password is {####}`,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    // const authDomain = `auth-${DOMAIN_NAME}`;
    // const userPoolAuthDomain = this.cognitoUserPool.addDomain('AuthDomain', {
    //   customDomain: {
    //     domainName: authDomain,
    //     certificate: props.certificate,
    //   },
    // });

    // const rootDomain = authDomain.split('.').slice(-2).join('.');
    // const zone = route53.HostedZone.fromLookup(this, 'AuthHostedZone', {
    //   domainName: rootDomain,
    // });

    // new route53.ARecord(this, 'AuthAliasRecord', {
    //   zone,
    //   target: route53.RecordTarget.fromAlias(
    //     new targets.UserPoolDomainTarget(userPoolAuthDomain),
    //   ),
    //   recordName: authDomain,
    //   comment: `Cognito custom domain for ${authDomain}`,
    // });

    this.userPoolClient = this.cognitoUserPool.addClient(id, {
      userPoolClientName: namer().regional(),
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls: [
          props.callbackUrl,
          'http://localhost',
          'https://localhost',
          'capacitor://localhost',
          `${DOMAIN_PACKAGE}://${PROJECT_DOMAIN}`,
          `http://localhost:${MOBILE_PORT}`,
        ],
        logoutUrls: [
          props.logoutUrl,
          'http://localhost',
          'https://localhost',
          'capacitor://localhost',
          `${DOMAIN_PACKAGE}://${PROJECT_DOMAIN}`,
          `http://localhost:${MOBILE_PORT}`,
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        ...(props.googleClientId && props.googleClientSecret
          ? [cognito.UserPoolClientIdentityProvider.GOOGLE]
          : []),
      ],
    });

    this.domainName = namer().regional();
    this.cognitoUserPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: this.domainName,
      },
    });

    this.signInUrl = `https://${this.domainName}.auth.${stack.region}.amazoncognito.com`;

    if (props.googleClientId && props.googleClientSecret) {
      new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool: this.cognitoUserPool,
        clientId: props.googleClientId,
        clientSecret: props.googleClientSecret,
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        },
        scopes: ['email'],
      });
    }
  }
}
